//! Kempston Mouse implementation.
use super::{MouseInterface, MouseDevice, MouseMovement, MouseButtons};
/*
Horizontal position: IN 64479
Vertical postition: IN 65503
Buttons: IN 64223 [255 = None], [254 = Left], [253 = Right], [252 = Both]
*/
const LEFT_BTN_MASK:   u8 = 0b0000_0001;
const RIGHT_BTN_MASK:  u8 = 0b0000_0010;
const UNUSED_BTN_MASK: u8 = !(LEFT_BTN_MASK|RIGHT_BTN_MASK); 

const PORT_BTN_MASK: u16 = 0b0000_0001_0000_0000;
const PORT_BTN_BITS: u16 = 0b0000_0000_0000_0000;
const PORT_POS_MASK: u16 = 0b0000_0101_0000_0000;
const PORT_X_MASK:   u16 = 0b0000_0001_0000_0000;
const PORT_Y_MASK:   u16 = 0b0000_0101_0000_0000;

/// The Kempston Mouse device implements [MouseDevice] and [MouseInterface].
#[derive(Clone, Copy, Debug)]
pub struct KempstonMouseDevice {
    data_btn: u8,
    data_x: u8,
    data_y: u8,
    buttons: MouseButtons,
}

impl Default for KempstonMouseDevice {
    fn default() -> Self {
        KempstonMouseDevice {
            data_btn: !0,
            data_x: !0,
            data_y: !0,
            buttons: Default::default(),
        }
    }
}

impl MouseDevice for KempstonMouseDevice {
    #[inline]
    fn port_read(&self, port: u16) -> u8 {
        if port & PORT_BTN_MASK == PORT_BTN_BITS {
            self.data_btn
        }
        else {
            match port & PORT_POS_MASK {
                PORT_X_MASK => self.data_x,
                PORT_Y_MASK => self.data_y,
                _ => unsafe { core::hint::unreachable_unchecked() }
            }
        }
    }
}

impl MouseInterface for KempstonMouseDevice {
    #[inline]
    fn set_buttons(&mut self, buttons: MouseButtons) {
        self.buttons = buttons;
        self.data_btn = (self.data_btn & UNUSED_BTN_MASK) |
            if buttons.intersects(MouseButtons::LEFT)  { 0 } else { LEFT_BTN_MASK  } |
            if buttons.intersects(MouseButtons::RIGHT) { 0 } else { RIGHT_BTN_MASK };
    }
    #[inline]
    fn get_buttons(&self) -> MouseButtons {
        self.buttons
    }
    #[inline]
    fn move_mouse<M: Into<MouseMovement>>(&mut self, mov: M) {
        let movement = mov.into();
        self.data_x = clamped_move(self.data_x, movement.horizontal);
        self.data_y = clamped_move(self.data_y, -movement.vertical);
    }
}

#[inline(always)]
fn clamped_move(prev: u8, coord: i16) -> u8 {
    prev.wrapping_add((coord >> 1) as u8)
}
