use core::convert::TryFrom;
use core::iter;
use core::str::FromStr;
use core::fmt;
use std::io::{self, Read};
use rand::prelude::*;

use serde::{Serialize, Deserialize};

use spectrusty::z80emu::{Cpu, Z80, {z80::Flavour}, host::Io};
use spectrusty::audio::Blep;
use spectrusty::clock::{FTs, VFrameTs};
use spectrusty::formats::snapshot::ComputerModel;
use spectrusty::memory::{
    ZxMemory, PagedMemory8k,
    Memory16kEx, Memory48kEx, Memory48kDock64kEx,
    MemoryExtension, NoMemoryExtension
};
use spectrusty::bus::{
    BusDevice, DeserializeDynDevice, SerializeDynDevice,
    ay::{
        serial128::{
            Ay3_8912KeypadRs232, Ay3_8912Rs232
        }
    },
    parallel::Plus3CentronicsWriterBusDevice
};
use spectrusty::chip::{
    FrameState, Ula128Control, Ula3Control, ScldControl,
    MemoryAccess, HostConfig,
    Ula128MemFlags, Ula3CtrlFlags, ScldCtrlFlags,
    ula::{Ula, UlaPAL, UlaNTSC, UlaVideoFrame, UlaNTSCVidFrame},
    ula128::{Ula128, Ula128VidFrame},
    ula3::{Ula3, Ula3VidFrame},
    scld::Scld,
    plus::UlaPlus,
};
use spectrusty::formats::snapshot::ensure_cpu_is_safe_for_snapshot;
use spectrusty::video::{Video, VideoFrame, BorderColor};
use spectrusty_utils::io::{Empty, Sink};

use super::devices::{DeviceAccess, DynamicDevices, PluggableJoystickDynamicBus};
use super::spectrum::{MemTap, EmulatorState, ZxSpectrum, SpectrumUla};

pub static ROM48: &[&[u8]] = &[include_bytes!("../../../resources/48.rom")];
pub static ROM_TC2048: &[&[u8]] = &[include_bytes!("../../../resources/tc2048.rom")];
pub static ROM128: &[&[u8]] = &[include_bytes!("../../../resources/128-0.rom"),
                            include_bytes!("../../../resources/128-1.rom")];
pub static ROM_PLUS2: &[&[u8]] = &[include_bytes!("../../../resources/plus2-0.rom"),
                               include_bytes!("../../../resources/plus2-1.rom")];
pub static ROM_PLUS3: &[&[u8]] = &[include_bytes!("../../../resources/plus3-0.rom"),
                               include_bytes!("../../../resources/plus3-1.rom"),
                               include_bytes!("../../../resources/plus3-2.rom"),
                               include_bytes!("../../../resources/plus3-3.rom")];
pub static ROM_PLUS2B: &[&[u8]] = &[include_bytes!("../../../resources/plus2b-0.rom"),
                               include_bytes!("../../../resources/plus2b-1.rom"),
                               include_bytes!("../../../resources/plus2b-2.rom"),
                               include_bytes!("../../../resources/plus2b-3.rom")];

/* First some chipset type declarations */

/// Timex TC2048 chipset.
pub type TC2048<D, X=NoMemoryExtension> = Scld<Memory48kDock64kEx, D, X, UlaVideoFrame>;
// ULA 128 with a AY-3-8912 sound processor + Keypad and RS232 in its I/O port A
pub type Ula128AyKeypad<D,
                        X=NoMemoryExtension,
                        R=Empty,
                        W=Sink> = Ula128<Ay3_8912KeypadRs232<Ula128VidFrame, D, R, W>, X>;
/// ULA +3 with +3 Centronics Port and with a AY-3-8912 sound processor + RS232 in its I/O port A
pub type Ula3Ay<D,
                X=NoMemoryExtension,
                R=Empty,
                W=Sink> = Ula3<Plus3CentronicsWriterBusDevice<
                                    Ay3_8912Rs232<Ula3VidFrame, D, R, W>,
                                    W>,
                                X>;
/// ULAplus with ULA +3
pub type Plus128<D,
                 X=NoMemoryExtension,
                 R=Empty,
                 W=Sink> = UlaPlus<Ula3Ay<D, X, R, W>>;

/* Then some model type declaration */
pub type ZxSpectrum16k<C, D, X=NoMemoryExtension, F=MemTap> = ZxSpectrum<C, UlaPAL<Memory16kEx, D, X>, F>;
pub type ZxSpectrum48k<C, D, X=NoMemoryExtension, F=MemTap> = ZxSpectrum<C, UlaPAL<Memory48kEx, D, X>, F>;
pub type ZxSpectrumNTSC<C, D, X=NoMemoryExtension, F=MemTap> = ZxSpectrum<C, UlaNTSC<Memory48kEx, D, X>, F>;
pub type TimexTC2048<C, D, X=NoMemoryExtension, F=MemTap> = ZxSpectrum<C, TC2048<D, X>, F>;
pub type ZxSpectrum128k<C, D, X=NoMemoryExtension,
                              F=MemTap,
                              R=Empty,
                              W=Sink> = ZxSpectrum<C, Ula128AyKeypad<D, X, R, W>, F>;
pub type ZxSpectrum2A<C, D, X=NoMemoryExtension,
                            F=MemTap,
                            R=Empty,
                            W=Sink> = ZxSpectrum<C, Ula3Ay<D, X, R, W>, F>;
// pub type ZxSpectrum3<C, D> = ZxSpectrum<C, Ula3Ay<FloppyDrive<D>>>;
pub type ZxSpectrum2B<C, D, X=NoMemoryExtension,
                            F=MemTap,
                            R=Empty,
                            W=Sink> = ZxSpectrum<C, Plus128<D, X, R, W>, F>;

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ModelRequest {
    Spectrum16,
    Spectrum48,
    SpectrumNTSC,
    Spectrum128,
    SpectrumPlus2,
    SpectrumPlus2A,
    SpectrumPlus3,
    TimexTC2048,
    SpectrumPlus2B,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ModelRequestIter(Option<ModelRequest>);

#[derive(Serialize, Deserialize)]
#[serde(tag = "model")]
#[serde(bound(
    deserialize = "C: Deserialize<'de>,
                   S: DeserializeDynDevice<'de> + 'de,
                   X: Deserialize<'de>,
                   R: Deserialize<'de> + Default,
                   W: Deserialize<'de> + Default",
    serialize = "C: Serialize, S: SerializeDynDevice, X: Serialize, R: Serialize, W: Serialize")
)]
pub enum ZxSpectrumModel<C: Cpu,
                         S,
                         X,
                         F=MemTap,
                         R: io::Read + fmt::Debug=Empty,
                         W: io::Write + fmt::Debug=Sink> {
    #[serde(rename = "ZX Spectrum 16k")]
    Spectrum16(ZxSpectrum16k<C, PluggableJoystickDynamicBus<S, UlaVideoFrame>, X, F>),
    #[serde(rename = "ZX Spectrum 48k")]
    Spectrum48(ZxSpectrum48k<C, PluggableJoystickDynamicBus<S, UlaVideoFrame>, X, F>),
    #[serde(rename = "ZX Spectrum NTSC")]
    SpectrumNTSC(ZxSpectrumNTSC<C, PluggableJoystickDynamicBus<S, UlaNTSCVidFrame>, X, F>),
    #[serde(rename = "ZX Spectrum 128k")]
    Spectrum128(ZxSpectrum128k<C, PluggableJoystickDynamicBus<S, Ula128VidFrame>, X, F, R, W>),
    #[serde(rename = "ZX Spectrum +2")]
    SpectrumPlus2(ZxSpectrum128k<C, PluggableJoystickDynamicBus<S, Ula128VidFrame>, X, F, R, W>),
    #[serde(rename = "ZX Spectrum +2A")]
    SpectrumPlus2A(ZxSpectrum2A<C, PluggableJoystickDynamicBus<S, Ula3VidFrame>, X, F, R, W>),
    // #[serde(rename = "ZX Spectrum +3")]
    // SpectrumPlus3(ZxSpectrum3<C, D, X, F>),
    #[serde(rename = "Timex TC2048")]
    TimexTC2048(TimexTC2048<C, PluggableJoystickDynamicBus<S, UlaVideoFrame>, X, F>),
    #[serde(rename = "ZX Spectrum +2B")]
    SpectrumPlus2B(ZxSpectrum2B<C, PluggableJoystickDynamicBus<S, Ula3VidFrame>, X, F, R, W>)
}

pub trait UlaPlusMode {
    fn is_ulaplus_enabled(&self) -> bool {
        false
    }

    fn enable_ulaplus_modes(&mut self, _enable: bool) -> bool {
        false
    }
}

#[macro_export]
macro_rules! spectrum_model_dispatch {
    ($model:ident($spec:ident) => $expr:expr) => {
        spectrum_model_dispatch!(($model)($spec) => $expr)
    };
    ($model:ident(mut $spec:ident) => $expr:expr) => {
        spectrum_model_dispatch!(($model)(mut $spec) => $expr)
    };
    (($model:expr)($($spec:tt)*) => $expr:expr) => {
        match $model {
            $crate::ZxSpectrumModel::Spectrum16($($spec)*) => $expr,
            $crate::ZxSpectrumModel::Spectrum48($($spec)*) => $expr,
            $crate::ZxSpectrumModel::SpectrumNTSC($($spec)*) => $expr,
            $crate::ZxSpectrumModel::Spectrum128($($spec)*)|
            $crate::ZxSpectrumModel::SpectrumPlus2($($spec)*)=> $expr,
            $crate::ZxSpectrumModel::SpectrumPlus2A($($spec)*) => $expr,
            $crate::ZxSpectrumModel::TimexTC2048($($spec)*) => $expr,
            $crate::ZxSpectrumModel::SpectrumPlus2B($($spec)*) => $expr,
        }
    };
}

#[macro_export]
macro_rules! spectrum_model_ula_dispatch {
    ($model:ident($sdd:ty, $ext:ty)::$($expr:tt)*) => {
        spectrum_model_ula_dispatch!(($model)($sdd, $ext)::$($expr)*)
    };
    (($model:expr)($sdd:ty, $ext:ty)::$($expr:tt)*) => {
        match $model {
            $crate::ZxSpectrumModel::Spectrum16(..) => UlaPAL::<Memory16kEx, PluggableJoystickDynamicBus<$sdd, UlaVideoFrame>, $ext>::$($expr)*,
            $crate::ZxSpectrumModel::Spectrum48(..) => UlaPAL::<Memory48kEx, PluggableJoystickDynamicBus<$sdd, UlaVideoFrame>, $ext>::$($expr)*,
            $crate::ZxSpectrumModel::SpectrumNTSC(..) => UlaNTSC::<Memory48kEx, PluggableJoystickDynamicBus<$sdd, UlaNTSCVidFrame>, $ext>::$($expr)*,
            $crate::ZxSpectrumModel::Spectrum128(..)|
            $crate::ZxSpectrumModel::SpectrumPlus2(..)|
            $crate::ZxSpectrumModel::SpectrumPlus2B(..) => Ula128AyKeypad::<PluggableJoystickDynamicBus<$sdd, Ula128VidFrame>, $ext>::$($expr)*,
            $crate::ZxSpectrumModel::SpectrumPlus2A(..) => Ula3Ay::<PluggableJoystickDynamicBus<$sdd, Ula3VidFrame>, $ext>::$($expr)*,
            $crate::ZxSpectrumModel::TimexTC2048(..) => TC2048::<PluggableJoystickDynamicBus<$sdd, UlaVideoFrame>, $ext>::$($expr)*
        }
    };
}

impl ModelRequest {
    pub fn iter() -> ModelRequestIter {
        ModelRequestIter(Some(ModelRequest::Spectrum16))
    }
}

impl Iterator for ModelRequestIter {
    type Item = ModelRequest;
    fn next(&mut self) -> Option<Self::Item> {
        use ModelRequest::*;
        let res = self.0;
        self.0 = match self.0 {
            Some(Spectrum16)     => Some(Spectrum48),
            Some(Spectrum48)     => Some(SpectrumNTSC),
            Some(SpectrumNTSC)   => Some(Spectrum128),
            Some(Spectrum128)    => Some(SpectrumPlus2),
            Some(SpectrumPlus2)  => Some(SpectrumPlus2A),
            Some(SpectrumPlus2A) => Some(SpectrumPlus3),
            Some(SpectrumPlus3)  => Some(TimexTC2048),
            Some(TimexTC2048)    => Some(SpectrumPlus2B),
            Some(SpectrumPlus2B) => None,
            None                 => None
        };
        res
    }
}

impl From<ModelRequest> for &str {
    fn from(model: ModelRequest) -> Self {
        use ModelRequest::*;
        match model {
            Spectrum16     => "ZX Spectrum 16k",
            Spectrum48     => "ZX Spectrum 48k",
            SpectrumNTSC   => "ZX Spectrum NTSC",
            Spectrum128    => "ZX Spectrum 128k",
            SpectrumPlus2  => "ZX Spectrum +2",
            SpectrumPlus2A => "ZX Spectrum +2A",
            SpectrumPlus3  => "ZX Spectrum +3",
            // SpectrumPlus3e => "ZX Spectrum +3e",
            // SpectrumSE     => "ZX Spectrum SE",
            TimexTC2048    => "Timex TC2048",
            // TimexTC2068    => "Timex TC2068",
            // TimexTS2068    => "Timex TS2068",
            SpectrumPlus2B => "ZX Spectrum +2B",
        }

    }
}

impl From<&'_ ModelRequest> for &str {
    fn from(model: &ModelRequest) -> Self {
        (*model).into()
    }
}

impl TryFrom<ComputerModel> for ModelRequest {
    type Error = String;

    fn try_from(model: ComputerModel) -> Result<Self, Self::Error> {
        use ComputerModel::*;
        Ok(match model {
            Spectrum16 => ModelRequest::Spectrum16,
            Spectrum48 => ModelRequest::Spectrum48,
            SpectrumNTSC => ModelRequest::SpectrumNTSC,
            Spectrum128 => ModelRequest::Spectrum128,
            SpectrumPlus2 => ModelRequest::SpectrumPlus2,
            SpectrumPlus2A => ModelRequest::SpectrumPlus2A,
            SpectrumPlus3 => ModelRequest::SpectrumPlus3,
            TimexTC2048 => ModelRequest::TimexTC2048,
            _ => return Err(
                format!("computer model: {} is currently not supported by this emulator", model)
            )
        })
    }
}

impl From<ModelRequest> for ComputerModel {
    fn from(req: ModelRequest) -> ComputerModel {
        use ModelRequest::*;
        match req {
            Spectrum16 => ComputerModel::Spectrum16,
            Spectrum48 => ComputerModel::Spectrum48,
            SpectrumNTSC => ComputerModel::SpectrumNTSC,
            Spectrum128 => ComputerModel::Spectrum128,
            SpectrumPlus2 => ComputerModel::SpectrumPlus2,
            SpectrumPlus2A => ComputerModel::SpectrumPlus2A,
            SpectrumPlus3 => ComputerModel::SpectrumPlus3,
            TimexTC2048 => ComputerModel::TimexTC2048,
            SpectrumPlus2B => ComputerModel::SpectrumPlus2A,
        }
    }
}

impl fmt::Display for ModelRequest {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        <&str>::from(self).fmt(f)
    }
}

impl FromStr for ModelRequest {
    type Err = &'static str;
    fn from_str(mut model: &str) -> Result<Self, Self::Err> {
        // if let Some(unfixed) = model.strip_prefix("ZX Spectrum ") {
        //     model = unfixed;
        // }
        if model.starts_with("ZX Spectrum ") {
            model = &model["ZX Spectrum ".len()..];
        }
        else if model.starts_with("Timex ") {
            model = &model["Timex ".len()..];
        }
        match model {
            "16k"    => Ok(ModelRequest::Spectrum16),
            "48k"    => Ok(ModelRequest::Spectrum48),
            "NTSC"   => Ok(ModelRequest::SpectrumNTSC),
            "128k"   => Ok(ModelRequest::Spectrum128),
            "+2"     => Ok(ModelRequest::SpectrumPlus2),
            "+2A"    => Ok(ModelRequest::SpectrumPlus2A),
            "+3"     => Ok(ModelRequest::SpectrumPlus3),
            "TC2048" => Ok(ModelRequest::TimexTC2048),
            "+2B"    => Ok(ModelRequest::SpectrumPlus2B),
                   _ => Err("Unrecognized computer model")
        }
    }
}

impl<C: Cpu, S, X, F, R, W> From<&ZxSpectrumModel<C, S, X, F, R, W>> for ModelRequest
    where R: io::Read + fmt::Debug,
          W: io::Write + fmt::Debug
{
    fn from(model: &ZxSpectrumModel<C, S, X, F, R, W>) -> Self {
        match model {
            ZxSpectrumModel::Spectrum16(..) => ModelRequest::Spectrum16,
            ZxSpectrumModel::Spectrum48(..) => ModelRequest::Spectrum48,
            ZxSpectrumModel::SpectrumNTSC(..) => ModelRequest::SpectrumNTSC,
            ZxSpectrumModel::Spectrum128(..) => ModelRequest::Spectrum128,
            ZxSpectrumModel::SpectrumPlus2(..) => ModelRequest::SpectrumPlus2,
            ZxSpectrumModel::SpectrumPlus2A(..) => ModelRequest::SpectrumPlus2A,
            ZxSpectrumModel::TimexTC2048(..) => ModelRequest::TimexTC2048,
            ZxSpectrumModel::SpectrumPlus2B(..) => ModelRequest::SpectrumPlus2B,
        }
    }
}

impl<C, S, X, F, R, W> ZxSpectrumModel<C, S, X, F, R, W>
    where C: Cpu,
          X: MemoryExtension + Default,
          R: io::Read + fmt::Debug + Default,
          W: io::Write + fmt::Debug + Default
{
    pub fn new(req: ModelRequest) -> Self {
        use ModelRequest::*;
        match req {
            Spectrum16 => ZxSpectrumModel::Spectrum16(ZxSpectrum::default().with_roms(ROM48, 0)),
            Spectrum48 => ZxSpectrumModel::Spectrum48(ZxSpectrum::default().with_roms(ROM48, 0)),
            SpectrumNTSC => ZxSpectrumModel::SpectrumNTSC(ZxSpectrum::default().with_roms(ROM48, 0)),
            Spectrum128 => ZxSpectrumModel::Spectrum128(ZxSpectrum::default().with_roms(ROM128, 0)),
            SpectrumPlus2 => ZxSpectrumModel::SpectrumPlus2(ZxSpectrum::default().with_roms(ROM_PLUS2, 0)),
            SpectrumPlus2A => ZxSpectrumModel::SpectrumPlus2A(ZxSpectrum::default().with_roms(ROM_PLUS3, 0)),
            TimexTC2048 => ZxSpectrumModel::TimexTC2048(ZxSpectrum::default().with_roms(ROM_TC2048, 9)),
            SpectrumPlus2B => ZxSpectrumModel::SpectrumPlus2B(ZxSpectrum::default().with_roms(ROM_PLUS2B, 0)),
            SpectrumPlus3 => {
                unimplemented!()
                // ZxSpectrumModel::SpectrumPlus3(ZxSpectrum::default().with_roms(ROM_PLUS3, 0))
            }
        }
    }
}

impl<C: Cpu, U, F> ZxSpectrum<C, U, F>
    where U: MemoryAccess
{
    pub fn with_roms(mut self, roms: &[&[u8]], offs: usize) -> Self {
        let mem = self.ula.memory_mut();
        mem.fill_mem(.., random).unwrap();
        for (n, rom) in roms.iter().flat_map(|rom| rom.chunks_exact(U::Memory::PAGE_SIZE)).enumerate() {
            mem.load_into_rom_bank(n + offs, rom).unwrap();
        }
        self
    }
}

impl<C: Cpu, U, F> ZxSpectrum<C, U, F>
    where U: DeviceAccess,
          U::VideoFrame: 'static
{
    pub fn set_state(&mut self, state: EmulatorState<F>) {
        self.state = state;
        self.rebuild_device_index();
    }
}

impl<C: Cpu, M, D, X, V, F> ZxSpectrum<C, Ula<M, D, X, V>, F>
    where M: ZxMemory,
          X: MemoryExtension,
          V: VideoFrame
{
    pub fn copy_from<S, R, W>(&mut self, model: ZxSpectrumModel<C, S, X, F, R, W>)
        where <Self as SpectrumUla>::Chipset: DeviceAccess,
              R: io::Read + fmt::Debug + Default,
              W: io::Write + fmt::Debug + Default,
              D: 'static, M: 'static, X: 'static, V: 'static
              
    {
        let border = model.border_color();
        let mem_rd = model.read_ram();
        let _ = self.ula.memory_mut().load_into_mem(M::PAGE_SIZE as u16.., mem_rd);
        let (cpu, state) = model.into_cpu_and_state();
        self.cpu = cpu;
        self.set_state(state);
        self.ula.set_border_color(border);
    }
}

impl<C: Cpu, D, X, V, F> ZxSpectrum<C, Scld<Memory48kDock64kEx, D, X, V>, F>
    where X: MemoryExtension,
          V: VideoFrame,
{
    pub fn copy_from<S, R, W>(&mut self, model: ZxSpectrumModel<C, S, X, F, R, W>)
        where <Self as SpectrumUla>::Chipset: DeviceAccess,
              R: io::Read + fmt::Debug + Default,
              W: io::Write + fmt::Debug + Default,
              D: 'static, X: 'static, V: 'static
    {
        let border = model.border_color();
        let mem_rd = model.read_ram();
        let _ = self.ula.memory_mut().load_into_mem(
                    2 * Memory48kDock64kEx::PAGE_SIZE as u16.., mem_rd);
        let (cpu, state) = model.into_cpu_and_state();
        self.cpu = cpu;
        self.set_state(state);
        self.ula.set_border_color(border);
    }
}

impl<C: Cpu, D, X, F, R, W> ZxSpectrum128k<C, D, X, F, R, W>
    where D: BusDevice,
          X: MemoryExtension,
{
    pub fn copy_from<S>(&mut self, model: ZxSpectrumModel<C, S, X, F, R, W>)
        where <Self as SpectrumUla>::Chipset: DeviceAccess,
              R: io::Read + fmt::Debug + 'static,
              W: io::Write + fmt::Debug + 'static,
              D: 'static, X: 'static
    {
        let border = model.border_color();
        let mem_rd = model.read_ram();
        let _ = self.ula.memory_mut().load_into_mem(
                <Ula128 as MemoryAccess>::Memory::PAGE_SIZE as u16..,
                mem_rd);
        let (cpu, state) = model.into_cpu_and_state();
        self.cpu = cpu;
        self.set_state(state);
        self.ula.set_border_color(border);
        // lock in 48k mode until reset
        self.lock_48k_mode();
    }

    pub fn lock_48k_mode(&mut self) {
        self.ula.set_ula128_mem_port_value(Ula128MemFlags::ROM_BANK
                                          |Ula128MemFlags::LOCK_MMU)
        // self.ula.write_io(0x7ffd, 0b0011_0000, VideoTs::default());
    }
}

impl<C: Cpu, D, X, F, R, W> ZxSpectrum2A<C, D, X, F, R, W>
    where D: BusDevice<Timestamp=VFrameTs<Ula3VidFrame>>,
          R: io::Read + fmt::Debug,
          W: io::Write + fmt::Debug,
          X: MemoryExtension
{
    pub fn copy_from<S>(&mut self, model: ZxSpectrumModel<C, S, X, F, R, W>)
        where <Self as SpectrumUla>::Chipset: DeviceAccess,
              D: 'static, R: 'static,  W: 'static, X: 'static
    {
        let border = model.border_color();
        let mem_rd = model.read_ram();
        let _ = self.ula.memory_mut().load_into_mem(
                <Ula3 as MemoryAccess>::Memory::PAGE_SIZE as u16..,
                mem_rd);
        let (cpu, state) = model.into_cpu_and_state();
        self.cpu = cpu;
        self.set_state(state);
        self.ula.set_border_color(border);
        // lock in 48k mode until reset
        self.lock_48k_mode();
    }

    pub fn lock_48k_mode(&mut self) {
        self.ula.set_ula3_ctrl_port_value(Ula3CtrlFlags::ROM_BANK_HI);
        // self.ula.write_io(0x1ffd, 0b0000_0100, VideoTs::default());
        self.ula.set_ula128_mem_port_value(Ula128MemFlags::ROM_BANK
                                          |Ula128MemFlags::LOCK_MMU)
        // self.ula.write_io(0x7ffd, 0b0011_0000, VideoTs::default());
    }
}

impl<C: Cpu, D, X, F, R, W> ZxSpectrum2B<C, D, X, F, R, W>
    where D: BusDevice<Timestamp=VFrameTs<Ula3VidFrame>>,
          R: io::Read + fmt::Debug,
          W: io::Write + fmt::Debug,
          X: MemoryExtension,
{
    pub fn copy_from<S>(&mut self, model: ZxSpectrumModel<C, S, X, F, R, W>)
        where <Self as SpectrumUla>::Chipset: DeviceAccess,
              D: 'static, R: 'static, W: 'static, X: 'static
     {
        let border = model.border_color();
        let mem_rd = model.read_ram();
        let _ = self.ula.memory_mut().load_into_mem(
                <Ula128 as MemoryAccess>::Memory::PAGE_SIZE as u16..,
                mem_rd);
        let (cpu, state) = model.into_cpu_and_state();
        self.cpu = cpu;
        self.set_state(state);
        self.ula.set_border_color(border);
        // lock in 48k mode until reset
        self.lock_48k_mode();
    }

    pub fn lock_48k_mode(&mut self) {
        self.ula.set_ula3_ctrl_port_value(Ula3CtrlFlags::empty());
        // self.ula.write_io(0x1ffd, 0b0000_0000, VideoTs::default());
        self.ula.set_ula128_mem_port_value(Ula128MemFlags::ROM_BANK
                                          |Ula128MemFlags::LOCK_MMU)
        // self.ula.write_io(0x7ffd, 0b0011_0000, VideoTs::default());
    }
}

impl<C, S, X, F, R, W> ZxSpectrumModel<C, S, X, F, R, W>
    where C: Cpu,
          X: MemoryExtension,
          R: io::Read + fmt::Debug,
          W: io::Write + fmt::Debug
{
    pub fn emulator_state_mut(&mut self) -> &mut EmulatorState<F> {
        spectrum_model_dispatch!(self(spec) => &mut spec.state)
    }

    pub fn emulator_state_ref(&self) -> &EmulatorState<F> {
        spectrum_model_dispatch!(self(spec) => &spec.state)
    }

    pub fn set_emulator_state(&mut self, state: EmulatorState<F>)
    {
        spectrum_model_dispatch!(self(spec) => spec.set_state(state))
    }

    pub fn effective_frame_duration_nanos(&self) -> u32 {
        spectrum_model_dispatch!(self(spec) => spec.effective_frame_duration_nanos())
    }

    pub fn effective_frame_duration(&self) -> core::time::Duration {
        spectrum_model_dispatch!(self(spec) => spec.effective_frame_duration())
    }

    pub fn effective_cpu_rate(&self) -> f64 {
        spectrum_model_dispatch!(self(spec) => spec.effective_cpu_rate())
    }

    pub fn ensure_audio_frame_time<B: Blep>(&self, blep: &mut B, sample_rate: u32) {
        spectrum_model_dispatch!(self(spec) => spec.ensure_audio_frame_time(blep, sample_rate))
    }

    pub fn lock_48k_mode(&mut self) -> bool {
        match self {
            ZxSpectrumModel::Spectrum16(..) => return false,
            ZxSpectrumModel::Spectrum128(spec128)|
            ZxSpectrumModel::SpectrumPlus2(spec128) => spec128.lock_48k_mode(),
            ZxSpectrumModel::SpectrumPlus2A(spec3) => spec3.lock_48k_mode(),
            ZxSpectrumModel::SpectrumPlus2B(plus128) => plus128.lock_48k_mode(),
            _ => {}
        }
        true
    }

    pub fn cpu_rate(&self) -> u32 {
        spectrum_model_ula_dispatch!(self(S, X)::CPU_HZ)
    }

    pub fn frame_tstates_count(&self) -> FTs {
        spectrum_model_ula_dispatch!(self(S, X)::FRAME_TSTATES)
    }

    pub fn pixel_density(&self) -> u32 {
        spectrum_model_ula_dispatch!(self(S, X)::PIXEL_DENSITY)
    }

    pub fn into_cpu_and_state(self) -> (C, EmulatorState<F>) {
        spectrum_model_dispatch!(self(spec) => (spec.cpu, spec.state))
    }
    // returns a dynamicly dispatched reader from RAM
    pub fn read_ram<'a>(&'a self) -> Box<dyn Read + 'a> {
        match self {
            ZxSpectrumModel::Spectrum16(spec16) => Box::new(spec16.ula.memory_ref().ram_ref()
                                                                      .chain(std::io::repeat(!0))),
            ZxSpectrumModel::Spectrum48(spec48) => Box::new(spec48.ula.memory_ref().ram_ref()),
            ZxSpectrumModel::SpectrumNTSC(spec48) => Box::new(spec48.ula.memory_ref().ram_ref()),
            ZxSpectrumModel::Spectrum128(spec128)|
            ZxSpectrumModel::SpectrumPlus2(spec128) => {
                let mem = spec128.ula.memory_ref();
                // returns paged in RAM banks as a chained reader
                Box::new(mem.page_ref(1).unwrap()
                    .chain(mem.page_ref(2).unwrap())
                    .chain(mem.page_ref(3).unwrap()))
            }
            ZxSpectrumModel::SpectrumPlus2A(spec3) => {
                let mem = spec3.ula.memory_ref();
                // returns paged in RAM banks as a chained reader
                Box::new(mem.page_ref(1).unwrap()
                    .chain(mem.page_ref(2).unwrap())
                    .chain(mem.page_ref(3).unwrap()))
            }
            ZxSpectrumModel::TimexTC2048(timex) => Box::new(timex.ula.memory_ref().ram_ref()),
            ZxSpectrumModel::SpectrumPlus2B(plus128) => {
                let mem = plus128.ula.memory_ref();
                // returns paged in RAM banks as a chained reader
                Box::new(mem.page_ref(1).unwrap()
                    .chain(mem.page_ref(2).unwrap())
                    .chain(mem.page_ref(3).unwrap()))
            }
        }
    }

    pub fn border_color(&self) -> BorderColor {
        spectrum_model_dispatch!(self(spec) => spec.ula.border_color())
    }

    pub fn cpu_mut(&mut self) -> &mut C {
        spectrum_model_dispatch!(self(spec) => &mut spec.cpu)
    }

    pub fn cpu_ref(&self) -> &C {
        spectrum_model_dispatch!(self(spec) => &spec.cpu)
    }

    pub fn current_tstate(&self) -> FTs {
        spectrum_model_dispatch!(self(spec) => spec.ula.current_tstate())
    }

    pub fn ula128_mem_port_value(&self) -> Option<Ula128MemFlags> {
        match self {
            ZxSpectrumModel::Spectrum128(spec128)|
            ZxSpectrumModel::SpectrumPlus2(spec128) => Some(spec128.ula.ula128_mem_port_value()),
            ZxSpectrumModel::SpectrumPlus2A(spec3) => Some(spec3.ula.ula128_mem_port_value()),
            ZxSpectrumModel::SpectrumPlus2B(plus128) => Some(plus128.ula.ula128_mem_port_value()),
            _ => None
        }
    }

    pub fn ula3_ctrl_port_value(&self) -> Option<Ula3CtrlFlags> {
        match self {
            ZxSpectrumModel::SpectrumPlus2A(spec3) => Some(spec3.ula.ula3_ctrl_port_value()),
            ZxSpectrumModel::SpectrumPlus2B(plus128) => Some(plus128.ula.ula3_ctrl_port_value()),
            _ => None
        }
    }

    pub fn scld_ctrl_port_value(&self) -> Option<ScldCtrlFlags> {
        match self {
            ZxSpectrumModel::TimexTC2048(timex) => Some(timex.ula.scld_ctrl_port_value()),
            _ => None
        }
    }

    pub fn scld_mmu_port_value(&self) -> Option<u8> {
        match self {
            ZxSpectrumModel::TimexTC2048(timex) => Some(timex.ula.scld_mmu_port_value()),
            _ => None
        }
    }

    /// hot-swap hardware models
    pub fn change_model(&mut self, request: ModelRequest)
        where X: Default + 'static,
              R: Default + 'static,
              W: Default + 'static,
              S: 'static
    {
        use ZxSpectrumModel::*;
        match (&*self, request) {
            (Spectrum16(..), ModelRequest::Spectrum16)|
            (Spectrum48(..), ModelRequest::Spectrum48)|
            (SpectrumNTSC(..), ModelRequest::SpectrumNTSC)|
            (Spectrum128(..), ModelRequest::Spectrum128)|
            (SpectrumPlus2(..), ModelRequest::SpectrumPlus2)|
            (SpectrumPlus2A(..), ModelRequest::SpectrumPlus2A)|
            (TimexTC2048(..), ModelRequest::TimexTC2048)|
            (SpectrumPlus2B(..), ModelRequest::SpectrumPlus2B) => {
                return
            }
            _ => {}
        }
        let prev_model = core::mem::replace(self, Self::new(request));
        match self {
            Spectrum16(spec16) => spec16.copy_from(prev_model),
            Spectrum48(spec48) => spec48.copy_from(prev_model),
            SpectrumNTSC(spec48) => spec48.copy_from(prev_model),
            Spectrum128(spec128)|SpectrumPlus2(spec128) => spec128.copy_from(prev_model),
            SpectrumPlus2A(spec3) => spec3.copy_from(prev_model),
            TimexTC2048(timex) => timex.copy_from(prev_model),
            SpectrumPlus2B(plus128) => plus128.copy_from(prev_model),
        }
    }

    pub fn set_frame_tstate(&mut self, ts: FTs) {
        spectrum_model_dispatch!(self(spec) => spec.ula.set_frame_tstate(ts))
    }

    pub fn write_port(&mut self, port: u16, data: u8) {
        spectrum_model_dispatch!(self(spec) => spec.ula.write_io(port, data, spec.ula.current_video_ts()));
    }

    pub fn ensure_cpu_is_safe_for_snapshot(&mut self) {
        spectrum_model_dispatch!(self(spec) => ensure_cpu_is_safe_for_snapshot(&mut spec.cpu, &mut spec.ula))
    }
}

impl<C, S, X, F, R, W> ZxSpectrumModel<C, S, X, F, R, W>
    where C: Cpu,
          S: 'static,
          X: MemoryExtension + 'static,
          F: io::Read + io::Write + io::Seek,
          R: io::Read + fmt::Debug + 'static,
          W: io::Write + fmt::Debug + 'static,
{
    pub fn reset_and_load(&mut self) -> crate::spectrum::Result<(FTs, bool)> {
        spectrum_model_dispatch!(self(spec) => spec.reset(true));
        use ZxSpectrumModel::*;
        type Zk = spectrusty::peripherals::ZXKeyboardMap;
        const LOAD_SE: Zk = Zk::from_bits_truncate(Zk::SS.bits()|Zk::Q.bits());
        const QUOTE: Zk = Zk::from_bits_truncate(Zk::SS.bits()|Zk::P.bits());
        const LOAD_QQ_EN: &[(Zk, u32)] = &[(Zk::J, 1), (QUOTE, 1), (Zk::SS, 4), (QUOTE, 1), (Zk::EN, 1)];
        const LOAD_QQ_EN_SE: &[(Zk, u32)] = &[(Zk::EN, 1), (Zk::empty(), 17), (LOAD_SE, 1), (QUOTE, 1), (Zk::SS, 4), (QUOTE, 1), (Zk::EN, 1)];
        match self {
            Spectrum16(spec16) => spec16.run_with_auto_type(48, LOAD_QQ_EN),
            Spectrum48(spec48) => spec48.run_with_auto_type(87, LOAD_QQ_EN),
            SpectrumNTSC(spec48) => spec48.run_with_auto_type(103, LOAD_QQ_EN),
            Spectrum128(spec128)|SpectrumPlus2(spec128) => spec128.run_with_auto_type(67, iter::once(&(Zk::EN, 1))),
            SpectrumPlus2A(spec3) => spec3.run_with_auto_type(87, iter::once(&(Zk::EN, 1))),
            TimexTC2048(timex) => timex.run_with_auto_type(87, LOAD_QQ_EN),
            SpectrumPlus2B(plus128) => plus128.run_with_auto_type(63, LOAD_QQ_EN_SE),
        }
    }
}

impl<CF: Flavour, S, X, F, R, W> ZxSpectrumModel<Z80<CF>, S, X, F, R, W>
    where R: io::Read + fmt::Debug,
          W: io::Write + fmt::Debug
{
    pub fn set_cpu<I: Into<Z80<CF>>>(&mut self, cpu: I) {
        let cpu = cpu.into();
        spectrum_model_dispatch!(self(spec) => spec.cpu = cpu)
    }
}

impl<M, B, X, V> UlaPlusMode for Ula<M, B, X, V> {}
impl<M: PagedMemory8k, B, X, V> UlaPlusMode for Scld<M, B, X, V> {}
impl<D, X> UlaPlusMode for Ula128<D, X> {}
impl<D, X> UlaPlusMode for Ula3<D, X> {}
impl<D, X> UlaPlusMode for UlaPlus<Ula3<D, X>>
    where D: BusDevice,
          X: MemoryExtension
{
    fn is_ulaplus_enabled(&self) -> bool {
        self.is_ulaplus_enabled()
    }

    fn enable_ulaplus_modes(&mut self, enable: bool) -> bool {
        self.enable_ulaplus_modes(enable);
        true
    }
}