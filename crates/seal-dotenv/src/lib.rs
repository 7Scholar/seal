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

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct RowId(u32);

impl RowId {
    pub fn new(raw: u32) -> Self {
        Self(raw)
    }

    pub fn raw(self) -> u32 {
        self.0
    }
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
    disabled: bool,
}

impl Entry {
    pub fn quote(&self) -> Quote {
        self.quote
    }

    pub fn disabled(&self) -> bool {
        self.disabled
    }

    fn created(key: String, value: String, disabled: bool) -> Self {
        Self {
            raw: String::new(),
            edited: true,
            key,
            value,
            quote: Quote::None,
            export_prefix: false,
            leading: String::new(),
            trailing_comment: None,
            disabled,
        }
    }

    fn recreated(self) -> Self {
        Self {
            edited: true,
            ..self
        }
    }

    pub fn set_value(&mut self, value: impl Into<String>) {
        let value = value.into();
        if value != self.value {
            self.value = value;
            self.edited = true;
        }
    }

    fn set_key(&mut self, key: impl Into<String>) {
        let key = key.into();
        if key != self.key {
            self.key = key;
            self.edited = true;
        }
    }

    fn set_disabled(&mut self, disabled: bool) {
        if disabled != self.disabled {
            self.disabled = disabled;
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
        if self.disabled {
            line.push_str("# ");
        }
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
    Malformed(String),
}

impl Line {
    fn is_managed(&self) -> bool {
        matches!(self, Self::Entry(_) | Self::Malformed(_))
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Row {
    pub id: RowId,
    pub line: Line,
}

#[derive(Debug, Clone, PartialEq, Eq)]
#[non_exhaustive]
pub enum Op {
    SetValue { row: RowId, value: String },
    SetKey { row: RowId, key: String },
    SetDisabled { row: RowId, disabled: bool },
    Insert { after: Option<RowId>, key: String, value: String, disabled: bool },
    Remove { row: RowId },
    ReplaceMalformed { row: RowId, text: String },
    Reorder { rows: Vec<RowId> },
}

#[derive(Debug, Clone, PartialEq, Eq)]
#[non_exhaustive]
pub enum ApplyError {
    UnknownRow(RowId),
    NotAnEntry(RowId),
    NotMalformed(RowId),
    InvalidKey(String),
    StillMalformed(String),
    IncompleteOrder,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EnvFile {
    rows: Vec<Row>,
    newline: Newline,
    trailing_newline: bool,
    next_id: u32,
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

        let lines: Vec<Line> = if source.is_empty() {
            Vec::new()
        } else {
            body.split('\n')
                .map(|line| parse_line(line.strip_suffix('\r').unwrap_or(line)))
                .collect()
        };

        let mut next_id = 0;
        let rows = lines
            .into_iter()
            .map(|line| {
                let id = RowId(next_id);
                next_id += 1;
                Row { id, line }
            })
            .collect();

        Self {
            rows,
            newline,
            trailing_newline,
            next_id,
        }
    }

    pub fn render(&self) -> String {
        let rendered: Vec<String> = self
            .rows
            .iter()
            .map(|row| match &row.line {
                Line::Blank(raw) | Line::Comment(raw) | Line::Malformed(raw) => raw.clone(),
                Line::Entry(entry) => entry.render(self.newline),
            })
            .collect();

        let mut out = rendered.join(self.newline.as_str());
        if self.trailing_newline {
            out.push_str(self.newline.as_str());
        }
        out
    }

    pub fn rows(&self) -> &[Row] {
        &self.rows
    }

    pub fn lines(&self) -> impl Iterator<Item = &Line> {
        self.rows.iter().map(|row| &row.line)
    }

    pub fn entries(&self) -> impl Iterator<Item = &Entry> {
        self.rows.iter().filter_map(|row| match &row.line {
            Line::Entry(entry) => Some(entry),
            _ => None,
        })
    }

    pub fn entry_mut(&mut self, key: &str) -> Option<&mut Entry> {
        self.rows.iter_mut().find_map(|row| match &mut row.line {
            Line::Entry(entry) if entry.key == key => Some(entry),
            _ => None,
        })
    }

    pub fn row_id(&self, key: &str) -> Option<RowId> {
        self.rows.iter().find_map(|row| match &row.line {
            Line::Entry(entry) if entry.key == key => Some(row.id),
            _ => None,
        })
    }

    fn index_of(&self, id: RowId) -> Result<usize, ApplyError> {
        self.rows
            .iter()
            .position(|row| row.id == id)
            .ok_or(ApplyError::UnknownRow(id))
    }

    pub fn apply(&mut self, ops: &[Op]) -> Result<Vec<RowId>, ApplyError> {
        self.validate(ops)?;

        let mut inserted = Vec::new();
        for op in ops {
            match op {
                Op::SetValue { row, value } => {
                    let index = self.index_of(*row)?;
                    match &mut self.rows[index].line {
                        Line::Entry(entry) => entry.set_value(value.clone()),
                        _ => return Err(ApplyError::NotAnEntry(*row)),
                    }
                }
                Op::SetKey { row, key } => {
                    let index = self.index_of(*row)?;
                    match &mut self.rows[index].line {
                        Line::Entry(entry) => entry.set_key(key.clone()),
                        _ => return Err(ApplyError::NotAnEntry(*row)),
                    }
                }
                Op::SetDisabled { row, disabled } => {
                    let index = self.index_of(*row)?;
                    match &mut self.rows[index].line {
                        Line::Entry(entry) => entry.set_disabled(*disabled),
                        _ => return Err(ApplyError::NotAnEntry(*row)),
                    }
                }
                Op::Insert {
                    after,
                    key,
                    value,
                    disabled,
                } => {
                    let index = match after {
                        Some(id) => self.index_of(*id)? + 1,
                        None => 0,
                    };
                    let id = RowId(self.next_id);
                    self.next_id += 1;
                    self.rows.insert(
                        index,
                        Row {
                            id,
                            line: Line::Entry(Entry::created(key.clone(), value.clone(), *disabled)),
                        },
                    );
                    inserted.push(id);
                }
                Op::Remove { row } => {
                    let index = self.index_of(*row)?;
                    self.rows.remove(index);
                }
                Op::ReplaceMalformed { row, text } => {
                    let index = self.index_of(*row)?;
                    if !matches!(self.rows[index].line, Line::Malformed(_)) {
                        return Err(ApplyError::NotMalformed(*row));
                    }
                    match parse_line(text) {
                        Line::Entry(entry) => self.rows[index].line = Line::Entry(entry.recreated()),
                        _ => return Err(ApplyError::StillMalformed(text.clone())),
                    }
                }
                Op::Reorder { rows } => self.reorder(rows)?,
            }
        }

        Ok(inserted)
    }

    fn validate(&self, ops: &[Op]) -> Result<(), ApplyError> {
        for op in ops {
            match op {
                Op::SetValue { row, .. }
                | Op::SetDisabled { row, .. }
                | Op::Remove { row }
                | Op::ReplaceMalformed { row, .. } => {
                    self.index_of(*row)?;
                }
                Op::SetKey { row, key } => {
                    self.index_of(*row)?;
                    if key.is_empty() || !is_plausible_key(key) {
                        return Err(ApplyError::InvalidKey(key.clone()));
                    }
                }
                Op::Insert { after, key, .. } => {
                    if let Some(id) = after {
                        self.index_of(*id)?;
                    }
                    if key.is_empty() || !is_plausible_key(key) {
                        return Err(ApplyError::InvalidKey(key.clone()));
                    }
                }
                Op::Reorder { rows } => {
                    for id in rows {
                        self.index_of(*id)?;
                    }
                }
            }
        }
        Ok(())
    }

    fn reorder(&mut self, order: &[RowId]) -> Result<(), ApplyError> {
        let slots: Vec<usize> = self
            .rows
            .iter()
            .enumerate()
            .filter(|(_, row)| row.line.is_managed())
            .map(|(index, _)| index)
            .collect();

        if order.len() != slots.len() {
            return Err(ApplyError::IncompleteOrder);
        }

        let mut taken = Vec::with_capacity(order.len());
        for id in order {
            let index = self.index_of(*id)?;
            if !self.rows[index].line.is_managed() || taken.contains(&index) {
                return Err(ApplyError::IncompleteOrder);
            }
            taken.push(index);
        }

        let moved: Vec<Row> = taken.iter().map(|index| self.rows[*index].clone()).collect();
        for (slot, row) in slots.iter().zip(moved) {
            self.rows[*slot] = row;
        }
        Ok(())
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
        let stripped = trimmed.trim_start_matches('#').trim_start();
        if let Line::Entry(entry) = parse_line(stripped) {
            return Line::Entry(Entry {
                raw: raw.to_owned(),
                leading: raw.chars().take_while(|c| c.is_whitespace()).collect(),
                disabled: true,
                ..entry
            });
        }
        return Line::Comment(raw.to_owned());
    }

    let leading: String = raw.chars().take_while(|c| c.is_whitespace()).collect();
    let (export_prefix, rest) = match trimmed.strip_prefix("export ") {
        Some(rest) if rest.contains('=') => (true, rest.trim_start()),
        _ => (false, trimmed),
    };

    let Some((key_part, value_part)) = rest.split_once('=') else {
        return Line::Malformed(raw.to_owned());
    };

    let key = key_part.trim_end().to_owned();
    if key.is_empty() || !is_plausible_key(&key) {
        return Line::Malformed(raw.to_owned());
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
        disabled: false,
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
