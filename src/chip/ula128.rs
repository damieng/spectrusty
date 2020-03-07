mod audio;
pub(crate) mod frame_cache;
mod io;
mod ay;
mod video;

use core::num::Wrapping;
// use core::ops::{Deref, DerefMut};
use z80emu::{*, host::{Result, cycles::M1_CYCLE_TS}};
use crate::audio::{AudioFrame};
use crate::bus::BusDevice;
use crate::chip::{ControlUnit, MemoryAccess, nanos_from_frame_tc_cpu_hz, ula::frame_cache::UlaFrameCache};
use crate::video::VideoFrame;
use crate::memory::{ZxMemory, Memory128k, MemoryBanks};
use crate::peripherals::ZXKeyboardMap;
// use crate::io::*;
use crate::clock::{VideoTs, VideoTsData1, FTs, Ts, VFrameTsCounter, MemoryContention};
use crate::chip::ula::{Ula, UlaTimestamp, UlaCpuExt, UlaMemoryContention};

pub use video::{Ula128VidFrame, Ula128MemContention};
pub use ay::*;

/// The ZX Spectrum 128's CPU clock in cycles per second.
pub const CPU_HZ: u32 = 3_546_900;

pub(self) type InnerUla<B> = Ula<Memory128k, B, Ula128VidFrame>;

/// ZX Spectrum 128k ULA.
#[derive(Clone, Debug)]
pub struct Ula128<B> {
    ula: InnerUla<B>,
    mem_page3_bank: u8,
    cur_screen_shadow: bool, // current shadow screen
    beg_screen_shadow: bool, // shadow screen when a frame began
    mem_locked: bool,
    shadow_frame_cache: UlaFrameCache<Ula128VidFrame>,
    screen_changes: Vec<VideoTs>,
}

impl<B> Default for Ula128<B>
where B: Default
{
    fn default() -> Self {
        Ula128 {
            ula: Default::default(),
            mem_page3_bank: 0,
            cur_screen_shadow: false,
            beg_screen_shadow: false,
            mem_locked: false,
            shadow_frame_cache: Default::default(),
            screen_changes: Vec::new()
        }
    }
}

impl<B> Ula128<B> {
    #[inline(always)]
    fn is_page3_contended(&self) -> bool {
        self.mem_page3_bank & 1 == 1
    }

    #[inline(always)]
    fn page3_screen_bank(&self) -> Option<u8> {
        match self.mem_page3_bank {
            5 => Some(0),
            7 => Some(1),
            _ => None
        }
    }
}

impl<B> MemoryAccess for Ula128<B>
{
    type Memory = Memory128k;
    /// Returns a mutable reference to the memory.
    fn memory_mut(&mut self) -> &mut Self::Memory {
        &mut self.ula.memory
    }
    /// Returns a reference to the memory.
    fn memory_ref(&self) -> &Self::Memory {
        &self.ula.memory
    }
}

impl<B> ControlUnit for Ula128<B>
    where B: BusDevice<Timestamp=VideoTs>
{
    type BusDevice = B;

    fn cpu_clock_rate(&self) -> u32 {
        CPU_HZ
    }

    fn frame_duration_nanos(&self) -> u32 {
        nanos_from_frame_tc_cpu_hz(Ula128VidFrame::FRAME_TSTATES_COUNT as u32, CPU_HZ) as u32
    }

    fn bus_device_mut(&mut self) -> &mut Self::BusDevice {
        &mut self.ula.bus
    }

    fn bus_device_ref(&self) -> &Self::BusDevice {
        &self.ula.bus
    }

    fn current_frame(&self) -> u64 {
        self.ula.frames.0
    }

    fn frame_tstate(&self) -> (u64, FTs) {
        Ula128VidFrame::vts_to_norm_tstates(self.ula.tsc, self.current_frame())
    }

    fn current_tstate(&self) -> FTs {
        Ula128VidFrame::vts_to_tstates(self.ula.tsc)
    }

    fn is_frame_over(&self) -> bool {
        Ula128VidFrame::is_vts_eof(self.ula.tsc)
    }

    fn reset<C: Cpu>(&mut self, cpu: &mut C, hard: bool) {
        if self.is_page3_contended() {
            self.ula_reset::<Ula128MemContention, _>(cpu, hard)
        }
        else {
            self.ula_reset::<UlaMemoryContention, _>(cpu, hard)
        }
        self.ula.memory.reset_banks();
        self.mem_page3_bank = 0;
        self.cur_screen_shadow = false;
        self.beg_screen_shadow = false;
        self.mem_locked = false;
    }

    fn nmi<C: Cpu>(&mut self, cpu: &mut C) -> bool {
        if self.is_page3_contended() {
            self.ula_nmi::<Ula128MemContention, _>(cpu)
        }
        else {
            self.ula_nmi::<UlaMemoryContention, _>(cpu)
        }
    }

    fn execute_next_frame<C: Cpu>(&mut self, cpu: &mut C) {
        loop {
            if self.is_page3_contended() {
                if self.ula_execute_next_frame_with_breaks::<Ula128VidFrame, Ula128MemContention, _>(cpu) {
                    break
                }
            }
            else {
                if self.ula_execute_next_frame_with_breaks::<Ula128VidFrame, UlaMemoryContention, _>(cpu) {
                    break;
                }
            }
        }
    }

    fn ensure_next_frame(&mut self) {
        self.ensure_next_frame_vtsc::<UlaMemoryContention>();
    }

    fn execute_single_step<C: Cpu, F: FnOnce(CpuDebug)>(
            &mut self,
            cpu: &mut C,
            debug: Option<F>
        ) -> Result<(),()>
    {
        if self.is_page3_contended() {
            self.ula_execute_single_step::<Ula128MemContention,_,_>(cpu, debug)
        }
        else {
            self.ula_execute_single_step::<UlaMemoryContention,_,_>(cpu, debug)
        }
    }
}

impl<B> Ula128<B>
    where B: BusDevice<Timestamp=VideoTs>
{
    #[inline]
    fn prepare_next_frame<T: MemoryContention>(
            &mut self,
            vtsc: VFrameTsCounter<Ula128VidFrame, T>
        ) -> VFrameTsCounter<Ula128VidFrame, T>
    {
        // println!("vis: {} nxt: {} p3: {}", self.beg_screen_shadow, self.cur_screen_shadow, self.mem_page3_bank);
        self.beg_screen_shadow = self.cur_screen_shadow;
        self.shadow_frame_cache.clear();
        self.screen_changes.clear();
        self.ula.prepare_next_frame(vtsc)
    }

}

impl<B> UlaTimestamp for Ula128<B>
    where B: BusDevice<Timestamp=VideoTs>
{
    type VideoFrame = Ula128VidFrame;
    #[inline(always)]
    fn video_ts(&self) -> VideoTs {
        self.ula.video_ts()
    }
    #[inline(always)]
    fn set_video_ts(&mut self, vts: VideoTs) {
        self.ula.set_video_ts(vts)
    }
    #[inline(always)]
    fn ensure_next_frame_vtsc<T: MemoryContention>(
            &mut self
        ) -> VFrameTsCounter<Self::VideoFrame, T>
    {
        let mut vtsc = VFrameTsCounter::from(self.ula.tsc);
        if vtsc.is_eof() {
            vtsc = self.prepare_next_frame(vtsc);
        }
        vtsc

    }
}

#[cfg(test)]
mod tests {
    use core::convert::TryInto;
    use crate::bus::NullDevice;
    use crate::video::Video;
    use super::*;
    type TestUla128 = Ula128::<NullDevice<VideoTs>>;

    #[test]
    fn test_ula128() {
        let ula128 = TestUla128::default();
        assert_eq!(<TestUla128 as Video>::VideoFrame::FRAME_TSTATES_COUNT, 70908);
        assert_eq!(ula128.cpu_clock_rate(), CPU_HZ);
        assert_eq!(ula128.cpu_clock_rate(), 3_546_900);
        assert_eq!(ula128.frame_duration_nanos(), (70908u64 * 1_000_000_000 / 3_546_900).try_into().unwrap());
    }
}