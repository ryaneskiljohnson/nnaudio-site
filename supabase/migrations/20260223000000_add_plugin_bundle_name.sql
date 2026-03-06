-- Migration: Add plugin_bundle_name to products table
--
-- This field stores the plugin's filesystem bundle name (e.g. "Cymasphere" from
-- "Cymasphere.component" or "Cymasphere.vst3"). The NNAudio Access desktop app
-- uses this to create the correct Application Support / AppData folder for the
-- LinkOSX / LinkWindows file, regardless of whether the plugin or sample library
-- is installed first.

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS plugin_bundle_name TEXT DEFAULT NULL;

COMMENT ON COLUMN products.plugin_bundle_name IS
    'Filesystem bundle name of the plugin (without extension). Used by NNAudio Access to '
    'determine the Application Support / AppData directory name for LinkOSX / LinkWindows.';
