#!/usr/bin/env python3
"""
@fileoverview Script to create product mapping between WooCommerce and Supabase products
@module create_product_mapping

This script compares WooCommerce product names with Supabase product names and creates
a mapping CSV for import purposes.
"""

import csv
import json
from pathlib import Path
from difflib import SequenceMatcher


def normalize_name(name):
    """
    @brief Normalize product name for comparison
    @param name Product name string
    @returns Normalized lowercase string
    """
    # Remove common suffixes/prefixes and normalize
    name = name.lower().strip()
    # Remove common variations
    replacements = [
        (' – xmas 2023', ''),
        (' – black friday', ''),
        (' – pluginomat deal', ''),
        (' 2024', ''),
        (' | modern song constructions', ''),
        (' – magic multi effect', ''),
        (' full', ''),
        (' trial', ''),
        ('free ', ''),
        (' plugin', ''),
        (' free', ''),
    ]
    for old, new in replacements:
        name = name.replace(old, new)
    return name.strip()


def similarity(a, b):
    """
    @brief Calculate similarity ratio between two strings
    @param a First string
    @param b Second string
    @returns Similarity ratio (0.0 to 1.0)
    """
    return SequenceMatcher(None, a, b).ratio()


def load_supabase_products():
    """
    @brief Load Supabase products from JSON export
    @returns Dictionary mapping normalized names to product info
    """
    # This will be populated with the Supabase data
    products_json = '''[{"id":"5b67e835-8f4b-46f7-ae07-cee6a033bfa5","name":"20 For 20 MIDI Bundle","slug":"20-for-20-midi-bundle","legacy_product_id":null,"status":"inactive"},{"id":"a5a5e9e1-3392-484a-b48f-4aca71fbb122","name":"Albanju","slug":"albanju","legacy_product_id":"4083","status":"active"},{"id":"3457232b-cb8c-4daa-b386-95895c50a7d6","name":"Alice Cthulhu","slug":"alice-cthulhu","legacy_product_id":null,"status":"active"},{"id":"de75e8b5-cb98-46da-8498-0486e130384f","name":"All Guitar Bundle","slug":"all-guitar-bundle","legacy_product_id":null,"status":"active"},{"id":"90bcf8a0-c3a0-487a-87ce-af085689ba49","name":"Analog Plugin Bundle","slug":"analog-plugin-bundle","legacy_product_id":null,"status":"active"},{"id":"0ba4b698-da40-49a6-9bde-f363adccc3fa","name":"Apache Flute","slug":"apache-flute","legacy_product_id":null,"status":"active"},{"id":"34fd6bb0-410e-4aff-a01d-8083596e7098","name":"Apache MIDI","slug":"apache-free-midi","legacy_product_id":null,"status":"active"},{"id":"4cb35721-03d1-4f69-8284-68ebc2dcae61","name":"Apogee","slug":"apogee","legacy_product_id":"200002","status":"inactive"},{"id":"0de3afc4-13c7-4965-80a0-6b257afe0c88","name":"Atmosphere Bundle","slug":"atmosphere-bundle","legacy_product_id":null,"status":"active"},{"id":"9fdd6900-da3e-434d-8a5d-10cfe66dc337","name":"Bakers Delight MIDI","slug":"bakers-delight-midi","legacy_product_id":null,"status":"active"},{"id":"0bcb1962-10ce-420b-937f-8ef65edb936e","name":"Bakers Dozen","slug":"bakers-dozen","legacy_product_id":null,"status":"active"},{"id":"1d9b81c8-2dc4-4282-b0f8-5b4b48a584e2","name":"Beat Lab","slug":"beat-lab","legacy_product_id":null,"status":"active"},{"id":"9d6020d0-ac39-4b11-8688-ead24f5c81ee","name":"Blaque","slug":"blaque","legacy_product_id":null,"status":"active"},{"id":"ab9f4420-e7e7-4b8a-afe6-10523b7d6c08","name":"Blossom MIDI","slug":"blossom-midi","legacy_product_id":null,"status":"active"},{"id":"3aff3e94-4fda-4460-9a51-7d501c277a36","name":"Broken MIDI","slug":"broken-midi","legacy_product_id":null,"status":"active"},{"id":"46aaabea-901f-4893-ad99-ea294b2914cc","name":"Cowboy Harp","slug":"cowboy-harp-free-jaw-harp-plugin","legacy_product_id":null,"status":"active"},{"id":"8e69ef7a-47b2-4c45-9aec-3dc99d202e65","name":"Cryptic Tales MIDI","slug":"cryptic-tales-midi","legacy_product_id":null,"status":"active"},{"id":"16f8a174-6178-4996-9331-3b2c921ed17c","name":"Crystal Ball","slug":"crystal-ball-magic-multi-effect","legacy_product_id":null,"status":"active"},{"id":"c00b22e5-1647-4145-b531-6ccb54e4c529","name":"Cthulhu Bundle 1","slug":"cthulhu-bundle-1","legacy_product_id":null,"status":"active"},{"id":"8b2b7400-e2c9-4c3f-8819-47d76f82660c","name":"Cthulhu Bundle 2","slug":"cthulhu-bundle-2","legacy_product_id":null,"status":"active"},{"id":"8c01eb8f-9183-4f6d-8c4d-fd9cf593a866","name":"Cthulhu Godz 1","slug":"cthulhu-godz-1","legacy_product_id":null,"status":"active"},{"id":"19775982-017e-44c2-8d44-abb4f7a3490d","name":"Cthulhu Godz 2","slug":"cthulhu-godz-2","legacy_product_id":null,"status":"active"},{"id":"d6ac2d9d-8042-41a3-a32a-d258b55e3db2","name":"Curio","slug":"curio-texture-generator","legacy_product_id":null,"status":"active"},{"id":"ae91f922-c778-4fef-91b7-74a7f7d1b7a9","name":"Curves EQ","slug":"curves-eq","legacy_product_id":null,"status":"active"},{"id":"c699bf58-1af7-4bff-b05c-0f76275c0c62","name":"Cymasphere","slug":"cymasphere","legacy_product_id":null,"status":"active"},{"id":"5c092419-5fed-44de-83a2-bd549db5507f","name":"CymaSynth","slug":"cymasynth","legacy_product_id":null,"status":"active"},{"id":"f98826e2-973c-4f1c-9109-c12a8289b900","name":"Demented Wisdom MIDI","slug":"demented-wisdom-midi","legacy_product_id":null,"status":"active"},{"id":"a03c75f0-d5c3-4689-9124-a787dd351fe8","name":"Digital Echoes Delay","slug":"digital-echoes-delay","legacy_product_id":null,"status":"active"},{"id":"e579dbd6-8b3d-451d-a5f9-8b1066e34b89","name":"DigitalDreamscape","slug":"digitaldreamscape-quad-rompler","legacy_product_id":null,"status":"active"},{"id":"08ea4008-1908-405a-bd36-4cf50de780bf","name":"Drum & Bass Bundle","slug":"drum-bass-bundle-2","legacy_product_id":null,"status":"active"},{"id":"4ce5e019-9f08-4f18-a903-d9776deb625b","name":"Drum & Perc Bundle","slug":"drum-perc-bundle","legacy_product_id":null,"status":"active"},{"id":"7dad03d2-898f-4643-af5e-425842b42163","name":"Eclipse","slug":"eclipse","legacy_product_id":"200005","status":"inactive"},{"id":"cc9c70b8-b167-4778-bf7e-42b7012ad79e","name":"Element Cthulhu","slug":"element-cthulhu","legacy_product_id":null,"status":"active"},{"id":"8fa7f953-c1d5-4143-a47b-def7876c8fe5","name":"Enchanted Melodies MIDI Pack Bundle","slug":"enchante_melodies_bundle","legacy_product_id":null,"status":"active"},{"id":"89b5149f-1263-4705-ba3c-d6ada6a21f94","name":"Entanglement","slug":"entanglement","legacy_product_id":"300001","status":"inactive"},{"id":"28eece1b-df54-4593-82a7-e9a21d6c3fcb","name":"Evanescent Baby Grand Piano","slug":"evanescent-baby-grand-piano","legacy_product_id":null,"status":"active"},{"id":"7b225890-2a1d-4b84-a2d5-cb177d4975d5","name":"Fabric","slug":"fabric","legacy_product_id":"300002","status":"inactive"},{"id":"de2da995-64f6-4424-89c1-7013c941210c","name":"Flower Cthulhu","slug":"flower-cthulhu","legacy_product_id":null,"status":"active"},{"id":"a617d04c-13cb-403c-8e12-0dcf13603859","name":"Freelay","slug":"freelay-free-delay-module-plugin","legacy_product_id":null,"status":"active"},{"id":"ed4723ea-7f3f-4558-9d24-1265773ae4b7","name":"FreeQ","slug":"freeq-free-eq-module-plugin","legacy_product_id":null,"status":"active"},{"id":"8c9d3944-873e-4761-8601-f7cc5067a10f","name":"Freeverb","slug":"freeverb-free-reverb-module-plugin","legacy_product_id":null,"status":"active"},{"id":"21d8b116-dac9-4577-9147-c78bc0be17da","name":"Fruit Salad MIDI","slug":"fruit-salad-midi","legacy_product_id":null,"status":"active"},{"id":"bd7fc185-5f90-4fc1-912e-2f41ca77830d","name":"Game Boi","slug":"game-boi-retro-sounds-free-plugin","legacy_product_id":null,"status":"active"},{"id":"4f986f2f-8c14-482f-850b-2e888b1ee2f1","name":"Go To Work","slug":"go-to-work-modern-song-constructions","legacy_product_id":null,"status":"active"},{"id":"088e3794-0e94-4c3b-a255-2ef4d090d6fa","name":"Guitar Bundle","slug":"guitar-bundle","legacy_product_id":null,"status":"active"},{"id":"03fd8145-d100-4cca-b15c-65827792ca91","name":"Hadron","slug":"hadron","legacy_product_id":"300003","status":"inactive"},{"id":"b6bfdb27-b099-4207-bd3f-fc4001246620","name":"Ion","slug":"ion","legacy_product_id":"200006","status":"inactive"},{"id":"8b1f1e42-bdce-4bb2-9621-c56f6694a0b1","name":"Kepler","slug":"kepler","legacy_product_id":"200003","status":"inactive"},{"id":"d6860201-ff98-4ab5-8195-8e82a5f359f5","name":"La Fleur MIDI","slug":"la-fleur-midi","legacy_product_id":null,"status":"archived"},{"id":"603364a8-739b-4069-a847-fba0a2ee128c","name":"Lagrange","slug":"lagrange","legacy_product_id":"200004","status":"inactive"},{"id":"06e99e43-eb45-4ba7-a5b3-bacf89f9f1f9","name":"Life & Death MIDI","slug":"life-death-midi","legacy_product_id":null,"status":"active"},{"id":"cad704c6-0f58-4e81-b110-f654bbbbe70f","name":"Lofi Jamz","slug":"lofi-jamz","legacy_product_id":null,"status":"active"},{"id":"fad87e8f-5e4f-45b4-9f40-89018d4d78d5","name":"Mai Tai MIDI","slug":"mai-tai-midi","legacy_product_id":null,"status":"active"},{"id":"fe2124c0-78eb-45d1-9414-3c41e39b46d5","name":"Mandelbrot","slug":"mandelbrot","legacy_product_id":"300004","status":"inactive"},{"id":"969f0ddb-d88e-4092-a94f-c960bc8f276d","name":"Mandelbrot Set Bundle","slug":"mandelbrot-set-bundle","legacy_product_id":null,"status":"inactive"},{"id":"bd0a35fd-8791-4a8c-8c33-a91a633e25e8","name":"Mandolele Mandolin & Ukulele","slug":"mandolele-mandolin-ukulele","legacy_product_id":null,"status":"active"},{"id":"6c05313b-6174-40ec-b736-856219e5979b","name":"Mesosphere","slug":"mesosphere","legacy_product_id":null,"status":"active"},{"id":"fc6e1f19-b4b9-44fc-b7ac-0783ea7b9186","name":"MIDI Library 1","slug":"midi-library-1","legacy_product_id":null,"status":"active"},{"id":"b7d8bc91-c719-48a8-86b9-e71f0904afcb","name":"MIDI Library 2","slug":"midi-library-2","legacy_product_id":null,"status":"active"},{"id":"ddf2b3a1-de4c-48d1-824e-521ecbd927eb","name":"MIDI Library 3","slug":"midi-library-3","legacy_product_id":null,"status":"active"},{"id":"52c08c7f-0184-4faa-ad0d-8c657c7950b9","name":"MIDI Library 4","slug":"midi-library-4","legacy_product_id":null,"status":"active"},{"id":"0bda2e88-8492-49c5-8d28-6d0808b45309","name":"MIDI Mob MIDI Bundle","slug":"midi-mob-midi-bundle","legacy_product_id":null,"status":"active"},{"id":"f4177a27-bfd9-4ea1-be0b-2ca02749558f","name":"MIDI Nerds","slug":"midi-nerds-free-midi","legacy_product_id":null,"status":"active"},{"id":"847ef5be-32ea-405e-b0b1-023de4247f96","name":"MIDI Takeout Bundle","slug":"midi-takeout-bundle","legacy_product_id":null,"status":"active"},{"id":"5f54256e-f20c-4e39-b6fe-fb5c73709549","name":"Modern Cthulhu 1","slug":"modern-cthulhu-1","legacy_product_id":null,"status":"active"},{"id":"9fc3cd3b-eec8-44c8-a1a7-e1c7500611cd","name":"Modern Cthulhu 2","slug":"modern-cthulhu-2","legacy_product_id":null,"status":"active"},{"id":"e01d9991-5f18-4c23-a459-bb4e0d951c8b","name":"Modern FX Bundle","slug":"modern-fx-bundle","legacy_product_id":null,"status":"active"},{"id":"d6f94b07-92b6-459d-8005-cebfd5b484f2","name":"Modern Song Constructions Bundle","slug":"modern-song-constructions-bundle","legacy_product_id":null,"status":"active"},{"id":"e0baaf19-2838-484e-bef7-c86f9b55bf25","name":"Modern Workstation Bundle","slug":"modern-workstation-bundle","legacy_product_id":null,"status":"active"},{"id":"b65d4ed2-5393-489f-9f37-e7713fd7d229","name":"Mutahad Sample Library","slug":"mutahad-sample-library","legacy_product_id":null,"status":"active"},{"id":"9ad5f7f7-e379-4516-bcd3-98bc98cc39bc","name":"Natura","slug":"natura","legacy_product_id":null,"status":"active"},{"id":"f8cc8942-be2b-4749-b248-1c9708d28a16","name":"NNAudio Access","slug":"nnaudio-access","legacy_product_id":null,"status":"active"},{"id":"e013d27e-d73c-4372-b2af-8f54275cf76b","name":"Noker","slug":"noker","legacy_product_id":null,"status":"active"},{"id":"2eb585b3-740f-457c-b1c2-67fc7a84970f","name":"Numb","slug":"numb","legacy_product_id":null,"status":"active"},{"id":"a9d86387-42d0-4b60-94b4-4abd0a00b8d4","name":"Obscura","slug":"obscura-tortured-orchestral-box","legacy_product_id":null,"status":"active"},{"id":"71f9d53b-85dc-4ff6-a6e9-826696af5240","name":"Obscura + Royal Family Bundle","slug":"obscura-royal-family-bundle-black-friday","legacy_product_id":null,"status":"active"},{"id":"069e42ba-eee1-4472-befa-abcb37aa89a7","name":"Observer","slug":"observer","legacy_product_id":"300005","status":"inactive"},{"id":"039bdd30-dee8-4700-8c27-319f72fdd738","name":"Ooze MIDI","slug":"ooze-midi","legacy_product_id":null,"status":"active"},{"id":"2709b432-45e9-4ae0-b998-8fad2eaf69bd","name":"Orbitals Bundle","slug":"orbitals-bundle","legacy_product_id":null,"status":"inactive"},{"id":"0fae3a57-27dc-4019-a8cf-2aad4773b50d","name":"Orchestral Plugin Bundle","slug":"orchestral-plugin-bundle","legacy_product_id":null,"status":"active"},{"id":"08114789-d853-4544-b026-c6870bcbc2dc","name":"Perc Gadget","slug":"perc-gadget","legacy_product_id":null,"status":"active"},{"id":"7b67d43d-12ff-4c8c-9866-26bdbc5f3f71","name":"Perihelion","slug":"perihelion","legacy_product_id":"200007","status":"inactive"},{"id":"116ac783-d841-42e7-91d2-7837aa8e5400","name":"Planck","slug":"planck","legacy_product_id":"300006","status":"inactive"},{"id":"eeeed3df-2486-4bc9-b43a-65f95b374e77","name":"Primal Cthulhu","slug":"primal-cthulhu","legacy_product_id":null,"status":"active"},{"id":"f2a406a0-02b6-4a0f-87cb-0bcc040b01b6","name":"Prodigious","slug":"prodigious","legacy_product_id":null,"status":"active"},{"id":"7fa22915-acad-4b68-8559-b3756f7c19c9","name":"Producer's Arsenal","slug":"producers-arsenal","legacy_product_id":null,"status":"active"},{"id":"3975c809-c2f6-42b7-bfbf-940ff679ece7","name":"Quarks","slug":"quarks","legacy_product_id":"300007","status":"inactive"},{"id":"c92beb38-f39c-444e-8848-df7019dc0962","name":"Quoir","slug":"quoir","legacy_product_id":null,"status":"active"},{"id":"43800acf-c5e1-4d1a-942f-bede7b3ff213","name":"Rabbit Hole MIDI","slug":"rabbit-hole-free-midi","legacy_product_id":null,"status":"active"},{"id":"8f4ff475-172b-424a-8add-fb7bafc88829","name":"Rabbithole","slug":"rabbithole","legacy_product_id":"300008","status":"inactive"},{"id":"e6df4c54-9924-4e92-9140-a1a869824a9a","name":"Reflection Cthulhu","slug":"reflection-cthulhu","legacy_product_id":null,"status":"active"},{"id":"99e541c6-53ca-430d-9c8d-a122c5afda12","name":"Reiya","slug":"reiya","legacy_product_id":null,"status":"active"},{"id":"efe94664-d08f-4be1-a1c1-9ff329a87fde","name":"Retrograde","slug":"retrograde","legacy_product_id":"200008","status":"inactive"},{"id":"c06fcb68-ef64-4b24-9b0a-9a346f4bfb64","name":"Ride Away","slug":"ride-away-modern-song-constructions","legacy_product_id":null,"status":"active"},{"id":"9d441668-1d34-4385-9cbe-078b716f2241","name":"Rompl Workstation","slug":"rompl-workstation","legacy_product_id":null,"status":"active"},{"id":"2296ce7b-bf92-4bc8-8c0f-85ace56d5401","name":"Royal Family MIDI","slug":"royal-family-midi","legacy_product_id":null,"status":"active"},{"id":"0548040a-591f-4cb9-8776-bae9edafaeaa","name":"Singularity","slug":"singularity","legacy_product_id":"300009","status":"inactive"},{"id":"85e02580-7a4c-4e9a-a905-2a5edd3a5e56","name":"So Far Gone MIDI","slug":"so-far-gone-midi","legacy_product_id":null,"status":"active"},{"id":"6c8e99c7-19df-4861-9918-9e00e87fc295","name":"Soundscapes Bundle","slug":"soundscapes-bundle","legacy_product_id":null,"status":"active"},{"id":"d7cb3189-7e14-4386-afbf-cc2c6ad5cffa","name":"Sterfreeo","slug":"sterfreeo-free-stereo-module-plugin","legacy_product_id":null,"status":"active"},{"id":"068f019d-177d-4203-9e4a-27b75ea2926e","name":"Strange Tingz","slug":"strange-tingz-free-80s-plugin","legacy_product_id":null,"status":"active"},{"id":"fb9c5795-103d-41c1-ad19-cf62f4826e6a","name":"SubFlux","slug":"subflux-bass-module","legacy_product_id":null,"status":"active"},{"id":"7292e85a-aef8-470a-96eb-1c23216a2943","name":"Summer Kickoff MIDI Bundle","slug":"summer-kickoff-midi-bundle","legacy_product_id":null,"status":"inactive"},{"id":"2cfb32e3-b48c-45d5-99aa-ae4cac46e905","name":"Summer Sample Pack Bundle","slug":"summer-sample-pack-bundle","legacy_product_id":null,"status":"active"},{"id":"19072fbb-2758-4d1e-90d3-4787baea120d","name":"Sun Goes Down MIDI","slug":"sun-goes-down-midi","legacy_product_id":null,"status":"active"},{"id":"5fcd6aac-7ebb-4cab-bbd6-69f0b84598e5","name":"Swiper MIDI","slug":"swiper-midi-free","legacy_product_id":null,"status":"active"},{"id":"af0833e9-ebe2-43ce-81cc-1b8f72e8a9c5","name":"Tactures","slug":"tactures","legacy_product_id":null,"status":"active"},{"id":"64d10503-970f-47ec-b86d-70528c5a2fdf","name":"Tetrad Guitars","slug":"tetrad-guitars","legacy_product_id":null,"status":"active"},{"id":"0d8fa4b1-43c0-44a4-86f1-821966ecf430","name":"Tetrad Keys","slug":"tetrad-keys","legacy_product_id":null,"status":"active"},{"id":"ff030a9f-197d-48e0-9a4b-2200c94b8168","name":"Tetrad Series","slug":"tetrad-series","legacy_product_id":"","status":"active"},{"id":"2591e80d-a751-4c67-87e8-e5cce7e956db","name":"Tetrad Winds","slug":"tetrad-winds","legacy_product_id":null,"status":"active"},{"id":"c892fd79-0aa8-4b84-8932-d0f65ef5706d","name":"The Code","slug":"the-code-modern-song-constructions","legacy_product_id":null,"status":"active"},{"id":"f297133a-9bc1-4af9-a51b-7a9ff1d419fb","name":"Tidal","slug":"tidal","legacy_product_id":"200001","status":"inactive"},{"id":"f0f627c8-93e8-4f0b-8825-d82987e44ae5","name":"Time Zones MIDI","slug":"time-zones-midi","legacy_product_id":null,"status":"active"},{"id":"fbeb4a56-bc56-45c5-afd3-f6fcc9b1e836","name":"Trapsoul MIDI","slug":"trapsoul-midi","legacy_product_id":null,"status":"active"},{"id":"043adf55-10ed-4737-8908-b7801c4f3aea","name":"Ultimate 808 Bundle","slug":"ultimate-808-bundle","legacy_product_id":null,"status":"archived"},{"id":"4d8d2662-af63-44af-810f-1286fba18e2c","name":"Ultimate Bundle","slug":"ultimate-bundle","legacy_product_id":null,"status":"active"},{"id":"7f1935a6-317e-4bb7-9a6d-8a717a52fca9","name":"Ultimate Drums & Percs 1","slug":"ultimate-drums-percs-1","legacy_product_id":null,"status":"active"},{"id":"900fa701-134f-49f0-a69c-22e5de52f8df","name":"Ultimate Drums & Percs 2","slug":"ultimate-drums-percs-2","legacy_product_id":null,"status":"active"},{"id":"46fa191f-5ecd-4038-9c22-6d32d044c0c4","name":"Ultimate MIDI Collection 1","slug":"ultimate-midi-collection-1","legacy_product_id":null,"status":"archived"},{"id":"471fcf92-33de-4f64-b730-5e52887a5215","name":"Ultimate MIDI Collection 2","slug":"ultimate-midi-collection-2","legacy_product_id":null,"status":"active"},{"id":"02c8d2dd-f26f-46ce-82a5-4d9993ea6787","name":"Ultimate MIDI Collection 3","slug":"ultimate-midi-collection-3","legacy_product_id":null,"status":"archived"},{"id":"4a8a69fd-24ca-4cff-ae47-9cb0530c404b","name":"Ultimate MIDI Collection 4","slug":"ultimate-midi-collection-4","legacy_product_id":null,"status":"archived"},{"id":"279f6f31-ecaf-4256-bf97-d9a9c06f06ac","name":"Ultimate MIDI Collection 5","slug":"ultimate-midi-collection-5","legacy_product_id":null,"status":"archived"},{"id":"5f68b5ef-2d1a-4524-b76b-64493b28cc91","name":"Ultimate MIDI Collection 6","slug":"ultimate-midi-collection-6","legacy_product_id":null,"status":"archived"},{"id":"e7039f7f-bb67-4a52-aaf9-7c4f9ca053f7","name":"UMC6 MIDI","slug":"umc6-midi","legacy_product_id":null,"status":"active"},{"id":"d6e3ed84-be77-4b88-8829-dde06f787b6a","name":"Weaknd Cthulhu","slug":"weaknd-cthulhu","legacy_product_id":null,"status":"active"},{"id":"13edc63b-6408-4ad6-b724-f1a85670d904","name":"Yonkers Cthulhu","slug":"yonkers-cthulhu","legacy_product_id":null,"status":"active"},{"id":"ae9c3b18-31ad-4031-bfe8-87b0300a1e1a","name":"Zenith","slug":"zenith","legacy_product_id":"200009","status":"inactive"}]'''
    
    products = json.loads(products_json)
    
    # Create lookup dictionaries
    by_name = {}
    by_normalized = {}
    
    for product in products:
        name = product['name']
        normalized = normalize_name(name)
        by_name[name.lower()] = product
        by_normalized[normalized] = product
    
    return by_name, by_normalized, products


def create_mapping(woocommerce_products):
    """
    @brief Create mapping between WooCommerce and Supabase products
    @param woocommerce_products List of WooCommerce product names
    @returns Tuple of (mapped, unmapped, needs_review)
    """
    by_name, by_normalized, all_products = load_supabase_products()
    
    mapped = []
    unmapped = []
    needs_review = []
    
    for woo_product in sorted(woocommerce_products):
        woo_lower = woo_product.lower()
        woo_normalized = normalize_name(woo_product)
        
        # Try exact match first
        if woo_lower in by_name:
            mapped.append({
                'woocommerce_name': woo_product,
                'supabase_id': by_name[woo_lower]['id'],
                'supabase_name': by_name[woo_lower]['name'],
                'supabase_status': by_name[woo_lower]['status'],
                'match_type': 'exact'
            })
            continue
        
        # Try normalized match
        if woo_normalized in by_normalized:
            mapped.append({
                'woocommerce_name': woo_product,
                'supabase_id': by_normalized[woo_normalized]['id'],
                'supabase_name': by_normalized[woo_normalized]['name'],
                'supabase_status': by_normalized[woo_normalized]['status'],
                'match_type': 'normalized'
            })
            continue
        
        # Try fuzzy match
        best_match = None
        best_score = 0
        for product in all_products:
            score = similarity(woo_normalized, normalize_name(product['name']))
            if score > best_score:
                best_score = score
                best_match = product
        
        if best_score >= 0.8:  # High confidence fuzzy match
            needs_review.append({
                'woocommerce_name': woo_product,
                'supabase_id': best_match['id'],
                'supabase_name': best_match['name'],
                'supabase_status': best_match['status'],
                'similarity': f"{best_score:.2f}",
                'match_type': 'fuzzy'
            })
        else:
            unmapped.append({
                'woocommerce_name': woo_product,
                'best_match': best_match['name'] if best_match else 'None',
                'similarity': f"{best_score:.2f}" if best_match else '0.00'
            })
    
    return mapped, unmapped, needs_review


if __name__ == '__main__':
    # Load WooCommerce products from the processed customers file
    script_dir = Path(__file__).parent
    exports_dir = script_dir.parent / 'exports'
    
    customers_file = exports_dir / 'customers_with_products.csv'
    
    # Extract unique products
    woocommerce_products = set()
    with open(customers_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            products = row['products'].split(' | ')
            woocommerce_products.update(products)
    
    print(f"Found {len(woocommerce_products)} unique WooCommerce products\n")
    
    # Create mapping
    mapped, unmapped, needs_review = create_mapping(woocommerce_products)
    
    # Write output files
    mapped_file = exports_dir / 'product_mapping_auto.csv'
    needs_review_file = exports_dir / 'product_mapping_review.csv'
    unmapped_file = exports_dir / 'product_mapping_unmapped.csv'
    
    # Write auto-mapped products
    with open(mapped_file, 'w', encoding='utf-8', newline='') as f:
        fieldnames = ['woocommerce_name', 'supabase_id', 'supabase_name', 'supabase_status', 'match_type']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(mapped)
    
    print(f"✓ Auto-mapped {len(mapped)} products → {mapped_file}")
    
    # Write products needing review
    if needs_review:
        with open(needs_review_file, 'w', encoding='utf-8', newline='') as f:
            fieldnames = ['woocommerce_name', 'supabase_id', 'supabase_name', 'supabase_status', 'similarity', 'match_type']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(needs_review)
        print(f"⚠ {len(needs_review)} products need review → {needs_review_file}")
    
    # Write unmapped products
    if unmapped:
        with open(unmapped_file, 'w', encoding='utf-8', newline='') as f:
            fieldnames = ['woocommerce_name', 'best_match', 'similarity']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(unmapped)
        print(f"✗ {len(unmapped)} products could not be mapped → {unmapped_file}")
    
    print("\n" + "="*60)
    print("Summary:")
    print(f"  Auto-mapped: {len(mapped)}")
    print(f"  Needs review: {len(needs_review)}")
    print(f"  Unmapped: {len(unmapped)}")
    print("="*60)
