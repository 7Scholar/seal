#[cfg(target_os = "macos")]
pub const STRIP_HEIGHT: f64 = 46.4;

#[cfg(test)]
mod tests {
    #[test]
    fn strip_height_matches_the_stylesheet() {
        let css = include_str!("../../ui/styles.css");
        let row = css
            .lines()
            .find(|line| line.contains("grid-template-rows"))
            .expect("the shell's grid rows define the strip height");
        let rem: f64 = row
            .split_whitespace()
            .find_map(|token| token.strip_suffix("rem")?.parse().ok())
            .expect("the first grid row is the strip, in rem");

        assert_eq!(
            rem * 16.0,
            super::STRIP_HEIGHT,
            "the stylesheet's strip height and STRIP_HEIGHT disagree, so the window controls will not be centred",
        );
    }
}

#[cfg(target_os = "macos")]
pub fn centre_window_controls(window: &tauri::Window, strip_height: f64) {
    use objc2::rc::Retained;
    use objc2_app_kit::{NSButton, NSWindow, NSWindowButton};

    let Ok(handle) = window.ns_window() else {
        return;
    };
    if handle.is_null() {
        return;
    }

    let ns_window: &NSWindow = unsafe { &*(handle as *const NSWindow) };

    let buttons: Vec<Retained<NSButton>> = [
        NSWindowButton::CloseButton,
        NSWindowButton::MiniaturizeButton,
        NSWindowButton::ZoomButton,
    ]
    .into_iter()
    .filter_map(|which| unsafe { ns_window.standardWindowButton(which) })
    .collect();

    let Some(first) = buttons.first() else {
        return;
    };

    let Some(container) = (unsafe { first.superview() }) else {
        return;
    };

    let button_height = unsafe { first.frame() }.size.height;
    let container_height = unsafe { container.frame() }.size.height;

    let wanted_top = (strip_height - button_height) / 2.0;
    let current_top = container_height - unsafe { first.frame() }.origin.y - button_height;
    let shift = current_top - wanted_top;

    let wanted_leading = (strip_height - button_height) / 2.0;
    let leading_shift = wanted_leading - unsafe { first.frame() }.origin.x;

    if shift.abs() < 0.5 && leading_shift.abs() < 0.5 {
        return;
    }

    for button in &buttons {
        let mut frame = unsafe { button.frame() };
        frame.origin.y += shift;
        frame.origin.x += leading_shift;
        unsafe { button.setFrameOrigin(frame.origin) };
    }
}

#[cfg(not(target_os = "macos"))]
pub fn centre_window_controls(_window: &tauri::Window, _strip_height: f64) {}
