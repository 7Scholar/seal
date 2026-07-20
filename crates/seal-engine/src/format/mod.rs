use std::io::{self, BufRead, BufReader, Read, Seek, Write};
use std::iter;

use age::secrecy::SecretString;
use zeroize::Zeroizing;

pub const WORK_FACTOR: u8 = 18;
pub const MINIMUM_WORK_FACTOR: u8 = 15;
pub const MAXIMUM_WORK_FACTOR: u8 = 22;

const ARMOR_MARKER: &[u8] = b"-----BEGIN AGE ENCRYPTED FILE-----";
const BINARY_MARKER: &[u8] = b"age-encryption.org/v1";
const PROBE_BYTES: usize = 64;
const COPY_CHUNK: usize = 64 * 1024;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
pub enum Encoding {
    Armored,
    Binary,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
pub enum Classification {
    Sealed { encoding: Encoding },
    Plaintext,
}

#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum FormatError {
    #[error("no candidate passphrase opened the file")]
    NoMatchingPassphrase,
    #[error("not a sealed file")]
    NotSealed,
    #[error("the sealed file is damaged or truncated")]
    Damaged,
    #[error("the sealed file demands more work than is permitted")]
    ExcessiveWork,
    #[error("the sealed file was produced with a weaker work factor than is accepted")]
    InsufficientWork,
    #[error("input or output failed")]
    Io(#[source] io::Error),
}

impl From<io::Error> for FormatError {
    fn from(source: io::Error) -> Self {
        Self::Io(source)
    }
}

pub fn seal<R: Read, W: Write>(
    mut plaintext: R,
    sink: W,
    passphrase: &SecretString,
    work_factor: u8,
) -> Result<(), FormatError> {
    let mut recipient = age::scrypt::Recipient::new(passphrase.clone());
    recipient.set_work_factor(work_factor);

    let encryptor = age::Encryptor::with_recipients(iter::once(&recipient as &dyn age::Recipient))
        .map_err(|_| FormatError::Damaged)?;

    let armored = age::armor::ArmoredWriter::wrap_output(sink, age::armor::Format::AsciiArmor)?;
    let mut writer = encryptor
        .wrap_output(armored)
        .map_err(|err| FormatError::Io(io::Error::other(err)))?;

    io::copy(&mut plaintext, &mut writer)?;

    let armored = writer
        .finish()
        .map_err(|err| FormatError::Io(io::Error::other(err)))?;
    armored.finish()?.flush()?;
    Ok(())
}

#[derive(Debug)]
pub struct Opened {
    pub candidate: usize,
    pub work_factor: u8,
}

pub fn unseal<R: Read + Seek, W: Write>(
    mut sealed: R,
    mut sink: W,
    candidates: &[SecretString],
) -> Result<Opened, FormatError> {
    sealed.rewind()?;
    let mut head = [0u8; PROBE_BYTES];
    let filled = fill(&mut sealed, &mut head)?;
    if classify_head(&head[..filled]) == Classification::Plaintext {
        return Err(FormatError::NotSealed);
    }

    sealed.rewind()?;
    let work_factor = work_factor_of(&mut sealed)
        .map_err(|_| FormatError::Damaged)?
        .ok_or(FormatError::Damaged)?;
    if work_factor < MINIMUM_WORK_FACTOR {
        return Err(FormatError::InsufficientWork);
    }

    let mut damaged = false;

    for (candidate, passphrase) in candidates.iter().enumerate() {
        let mut identity = age::scrypt::Identity::new(passphrase.clone());
        identity.set_max_work_factor(MAXIMUM_WORK_FACTOR);

        sealed.rewind()?;
        let decryptor = match age::Decryptor::new(age::armor::ArmoredReader::new(&mut sealed)) {
            Ok(decryptor) => decryptor,
            Err(age::DecryptError::InvalidHeader) => return Err(FormatError::NotSealed),
            Err(age::DecryptError::ExcessiveWork { .. }) => return Err(FormatError::ExcessiveWork),
            Err(_) => return Err(FormatError::Damaged),
        };

        let mut reader = match decryptor.decrypt(iter::once(&identity as &dyn age::Identity)) {
            Ok(reader) => reader,
            Err(age::DecryptError::DecryptionFailed | age::DecryptError::NoMatchingKeys) => {
                continue
            }
            Err(age::DecryptError::ExcessiveWork { .. }) => return Err(FormatError::ExcessiveWork),
            Err(_) => {
                damaged = true;
                continue;
            }
        };

        copy_secret(&mut reader, &mut sink)?;
        sink.flush()?;
        return Ok(Opened {
            candidate,
            work_factor,
        });
    }

    if damaged {
        Err(FormatError::Damaged)
    } else {
        Err(FormatError::NoMatchingPassphrase)
    }
}

fn fill<R: Read>(source: &mut R, buffer: &mut [u8]) -> io::Result<usize> {
    let mut filled = 0;
    while filled < buffer.len() {
        match source.read(&mut buffer[filled..])? {
            0 => break,
            n => filled += n,
        }
    }
    Ok(filled)
}

fn copy_secret<R: Read, W: Write>(source: &mut R, sink: &mut W) -> Result<u64, FormatError> {
    let mut buffer = Zeroizing::new(vec![0u8; COPY_CHUNK]);
    let mut total = 0u64;

    loop {
        let read = match source.read(&mut buffer) {
            Ok(0) => break,
            Ok(n) => n,
            Err(err) if err.kind() == io::ErrorKind::Interrupted => continue,
            Err(_) => return Err(FormatError::Damaged),
        };
        sink.write_all(&buffer[..read])?;
        total += read as u64;
    }

    Ok(total)
}

pub fn classify<R: Read>(source: R) -> io::Result<Classification> {
    let mut head = [0u8; PROBE_BYTES];
    let mut reader = BufReader::new(source);
    let filled = fill(&mut reader, &mut head)?;
    Ok(classify_head(&head[..filled]))
}

pub fn classify_head(head: &[u8]) -> Classification {
    if head.starts_with(ARMOR_MARKER) {
        Classification::Sealed {
            encoding: Encoding::Armored,
        }
    } else if head.starts_with(BINARY_MARKER) {
        Classification::Sealed {
            encoding: Encoding::Binary,
        }
    } else {
        Classification::Plaintext
    }
}

pub fn work_factor_of<R: Read>(sealed: R) -> io::Result<Option<u8>> {
    let mut header = Vec::new();
    let mut reader = BufReader::new(age::armor::ArmoredReader::new(sealed));

    loop {
        let mut line = String::new();
        if reader.read_line(&mut line)? == 0 {
            break;
        }

        if let Some(rest) = line.trim_end().strip_prefix("-> scrypt ") {
            return Ok(rest
                .rsplit(' ')
                .next()
                .and_then(|factor| factor.parse::<u8>().ok()));
        }

        if line.starts_with("--- ") {
            break;
        }

        header.push(line);
        if header.len() > 64 {
            break;
        }
    }

    Ok(None)
}
