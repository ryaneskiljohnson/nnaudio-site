-- First recorded click per platform for NNAudio Access installers (dashboard Downloads page).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nnaudio_access_installer_macos_at timestamptz,
  ADD COLUMN IF NOT EXISTS nnaudio_access_installer_windows_at timestamptz;

COMMENT ON COLUMN public.profiles.nnaudio_access_installer_macos_at IS
  'First dashboard download click for NNAudio Access macOS installer.';
COMMENT ON COLUMN public.profiles.nnaudio_access_installer_windows_at IS
  'First dashboard download click for NNAudio Access Windows installer.';
