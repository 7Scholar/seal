#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
pub enum Newline {
    Lf,
    Crlf,
}

impl Newline {
    fn as_str(self) -> &'static str {
        match self {
            Self::Lf => "\n",
            Self::Crlf => "\r\n",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
pub enum Quote {
    None,
    Single,
    Double,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Entry {
    raw: String,
    edited: bool,
    pub key: String,
    pub value: String,
    quote: Quote,
    export_prefix: bool,
    leading: String,
    trailing_comment: Option<String>,
}

impl Entry {
    pub fn quote(&self) -> Quote {
        self.quote
    }

    pub fn set_value(&mut self, value: impl Into<String>) {
        let value = value.into();
        if value != self.value {
            self.value = value;
            self.edited = true;
        }
    }

    fn render(&self, newline: Newline) -> String {
        if !self.edited {
            return self.raw.clone();
        }

        let quote = self.quote_for(&self.value);
        let rendered = match quote {
            Quote::None => self.value.clone(),
            Quote::Single => format!("'{}'", self.value),
            Quote::Double => format!("\"{}\"", escape_double(&self.value)),
        };

        let mut line = String::new();
        line.push_str(&self.leading);
        if self.export_prefix {
            line.push_str("export ");
        }
        line.push_str(&self.key);
        line.push('=');
        line.push_str(&rendered);
        if let Some(comment) = &self.trailing_comment {
            line.push_str(comment);
        }
        let _ = newline;
        line
    }

    fn quote_for(&self, value: &str) -> Quote {
        let needs_quoting = value.is_empty()
            || value.starts_with(char::is_whitespace)
            || value.ends_with(char::is_whitespace)
            || value.contains('#')
            || value.contains('\n')
            || value.contains('\r');

        match self.quote {
            Quote::Single if !value.contains('\'') && !value.contains('\n') => Quote::Single,
            Quote::Single => Quote::Double,
            Quote::Double => Quote::Double,
            Quote::None if needs_quoting => Quote::Double,
            Quote::None => Quote::None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
#[non_exhaustive]
pub enum Line {
    Blank(String),
    Comment(String),
    Entry(Entry),
    Unparseable(String),
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EnvFile {
    lines: Vec<Line>,
    newline: Newline,
    trailing_newline: bool,
}

impl EnvFile {
    pub fn parse(source: &str) -> Self {
        let newline = if source.contains("\r\n") {
            Newline::Crlf
        } else {
            Newline::Lf
        };
        let trailing_newline = source.ends_with('\n');

        let body = source.strip_suffix('\n').unwrap_or(source);
        let body = body.strip_suffix('\r').unwrap_or(body);

        let lines = if source.is_empty() {
            Vec::new()
        } else {
            body.split('\n')
                .map(|line| parse_line(line.strip_suffix('\r').unwrap_or(line)))
                .collect()
        };

        Self {
            lines,
            newline,
            trailing_newline,
        }
    }

    pub fn render(&self) -> String {
        let rendered: Vec<String> = self
            .lines
            .iter()
            .map(|line| match line {
                Line::Blank(raw) | Line::Comment(raw) | Line::Unparseable(raw) => raw.clone(),
                Line::Entry(entry) => entry.render(self.newline),
            })
            .collect();

        let mut out = rendered.join(self.newline.as_str());
        if self.trailing_newline {
            out.push_str(self.newline.as_str());
        }
        out
    }

    pub fn lines(&self) -> &[Line] {
        &self.lines
    }

    pub fn entries(&self) -> impl Iterator<Item = &Entry> {
        self.lines.iter().filter_map(|line| match line {
            Line::Entry(entry) => Some(entry),
            _ => None,
        })
    }

    pub fn entry_mut(&mut self, key: &str) -> Option<&mut Entry> {
        self.lines.iter_mut().find_map(|line| match line {
            Line::Entry(entry) if entry.key == key => Some(entry),
            _ => None,
        })
    }

    pub fn duplicate_keys(&self) -> Vec<String> {
        let mut seen = Vec::new();
        let mut duplicates = Vec::new();
        for entry in self.entries() {
            if seen.contains(&entry.key) {
                if !duplicates.contains(&entry.key) {
                    duplicates.push(entry.key.clone());
                }
            } else {
                seen.push(entry.key.clone());
            }
        }
        duplicates
    }

    pub fn newline(&self) -> Newline {
        self.newline
    }
}

fn parse_line(raw: &str) -> Line {
    let trimmed = raw.trim_start();

    if trimmed.is_empty() {
        return Line::Blank(raw.to_owned());
    }
    if trimmed.starts_with('#') {
        return Line::Comment(raw.to_owned());
    }

    let leading: String = raw.chars().take_while(|c| c.is_whitespace()).collect();
    let (export_prefix, rest) = match trimmed.strip_prefix("export ") {
        Some(rest) if rest.contains('=') => (true, rest.trim_start()),
        _ => (false, trimmed),
    };

    let Some((key_part, value_part)) = rest.split_once('=') else {
        return Line::Unparseable(raw.to_owned());
    };

    let key = key_part.trim_end().to_owned();
    if key.is_empty() || !is_plausible_key(&key) {
        return Line::Unparseable(raw.to_owned());
    }

    let (value, quote, trailing_comment) = parse_value(value_part);

    Line::Entry(Entry {
        raw: raw.to_owned(),
        edited: false,
        key,
        value,
        quote,
        export_prefix,
        leading,
        trailing_comment,
    })
}

fn is_plausible_key(key: &str) -> bool {
    !key.contains(char::is_whitespace) && !key.contains('#')
}

fn parse_value(part: &str) -> (String, Quote, Option<String>) {
    let value_part = part.trim_start();

    if let Some(rest) = value_part.strip_prefix('\'') {
        if let Some(end) = rest.find('\'') {
            let value = rest[..end].to_owned();
            let remainder = &rest[end + 1..];
            return (value, Quote::Single, non_empty(remainder));
        }
    }

    if let Some(rest) = value_part.strip_prefix('"') {
        if let Some(end) = find_unescaped_quote(rest) {
            let value = unescape_double(&rest[..end]);
            let remainder = &rest[end + 1..];
            return (value, Quote::Double, non_empty(remainder));
        }
    }

    match value_part.find(" #") {
        Some(index) => {
            let value = value_part[..index].trim_end().to_owned();
            (value, Quote::None, non_empty(&value_part[index..]))
        }
        None => (value_part.trim_end().to_owned(), Quote::None, None),
    }
}

fn non_empty(text: &str) -> Option<String> {
    if text.is_empty() {
        None
    } else {
        Some(text.to_owned())
    }
}

fn find_unescaped_quote(text: &str) -> Option<usize> {
    let bytes = text.as_bytes();
    let mut index = 0;
    while index < bytes.len() {
        match bytes[index] {
            b'\\' => index += 2,
            b'"' => return Some(index),
            _ => index += 1,
        }
    }
    None
}

fn unescape_double(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    let mut chars = text.chars();
    while let Some(c) = chars.next() {
        if c != '\\' {
            out.push(c);
            continue;
        }
        match chars.next() {
            Some('n') => out.push('\n'),
            Some('r') => out.push('\r'),
            Some('t') => out.push('\t'),
            Some('\\') => out.push('\\'),
            Some('"') => out.push('"'),
            Some('\'') => out.push('\''),
            Some('$') => out.push('$'),
            Some(other) => {
                out.push('\\');
                out.push(other);
            }
            None => out.push('\\'),
        }
    }
    out
}

fn escape_double(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    for c in value.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            other => out.push(other),
        }
    }
    out
}
