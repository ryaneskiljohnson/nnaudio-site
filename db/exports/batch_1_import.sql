
DO $$
DECLARE
    v_customer RECORD;
    v_user_id uuid;
    v_product_id uuid;
    v_total int := 0;
    v_success int := 0;
BEGIN
    CREATE TEMP TABLE batch_data (email text, fname text, lname text, pids uuid[]) ON COMMIT DROP;
    INSERT INTO batch_data VALUES
    ('+79187536533@yandex.ru', 'SERGEY', 'PADALTSIN', ARRAY['f4177a27-bfd9-4ea1-be0b-2ca02749558f', '5fcd6aac-7ebb-4cab-bbd6-69f0b84598e5', '43800acf-c5e1-4d1a-942f-bede7b3ff213', '34fd6bb0-410e-4aff-a01d-8083596e7098', '068f019d-177d-4203-9e4a-27b75ea2926e', '9fdd6900-da3e-434d-8a5d-10cfe66dc337', 'a03c75f0-d5c3-4689-9124-a787dd351fe8']::uuid[]),
    ('.71+mynavi@gmail.com', 'motoki', 'matsui', ARRAY['bd7fc185-5f90-4fc1-912e-2f41ca77830d']::uuid[]),
    ('0.00.000@mail.ru', 'Kakoi', 'Takoi', ARRAY['bd7fc185-5f90-4fc1-912e-2f41ca77830d']::uuid[]),
    ('00-hauteur.boom@icloud.com', 'Hauter', 'Boo', ARRAY['a03c75f0-d5c3-4689-9124-a787dd351fe8']::uuid[]),
    ('00-zalamero-husky@icloud.com', 'Brayan', 'Fernandez', ARRAY['bd7fc185-5f90-4fc1-912e-2f41ca77830d']::uuid[]),
    ('00123god@gmail.com', 'jack', 'zhung', ARRAY['46aaabea-901f-4893-ad99-ea294b2914cc']::uuid[]),
    ('00135riku@gmail.com', 're', 'fuyuno', ARRAY['a03c75f0-d5c3-4689-9124-a787dd351fe8']::uuid[]),
    ('001maxim+1@gmail.com', 'masd', 'sdaSAD', ARRAY['28eece1b-df54-4593-82a7-e9a21d6c3fcb']::uuid[]),
    ('001maxim@gmail.com', 'Mkas', 'Msdadas', ARRAY['bd7fc185-5f90-4fc1-912e-2f41ca77830d']::uuid[]),
    ('0050tui@gmail.com', 'Günni', 'banani', ARRAY['bd7fc185-5f90-4fc1-912e-2f41ca77830d']::uuid[]),
    ('00551014@email.ntou.edu.tw', 'terry', 'su', ARRAY['bd7fc185-5f90-4fc1-912e-2f41ca77830d']::uuid[]),
    ('006production@gmail.com', 'ryland', 'mccarthy', ARRAY['bd7fc185-5f90-4fc1-912e-2f41ca77830d']::uuid[]),
    ('007monchi@gmail.com', 'Carlos', 'Gonzalez', ARRAY['bd7fc185-5f90-4fc1-912e-2f41ca77830d']::uuid[]),
    ('00azuremoon00@gmail.com', 'Onan', 'Mejia', ARRAY['bd7fc185-5f90-4fc1-912e-2f41ca77830d', '99e541c6-53ca-430d-9c8d-a122c5afda12']::uuid[]),
    ('00caronte000@gmail.com', 'YAN', 'TERRONES', ARRAY['e579dbd6-8b3d-451d-a5f9-8b1066e34b89', 'a03c75f0-d5c3-4689-9124-a787dd351fe8', '99e541c6-53ca-430d-9c8d-a122c5afda12', 'bd7fc185-5f90-4fc1-912e-2f41ca77830d']::uuid[]),
    ('00krtbeats@gmail.com', 'k', 'g', ARRAY['bd7fc185-5f90-4fc1-912e-2f41ca77830d']::uuid[]),
    ('00pearl87@gmail.com', 'CRAIG', 'MCDONALD', ARRAY['bd7fc185-5f90-4fc1-912e-2f41ca77830d', '068f019d-177d-4203-9e4a-27b75ea2926e']::uuid[]),
    ('00reda711@gmail.com', 'rey', 'rey', ARRAY['bd7fc185-5f90-4fc1-912e-2f41ca77830d']::uuid[]),
    ('0103sounds@gmail.com', 'atushi', 'aoyama', ARRAY['f4177a27-bfd9-4ea1-be0b-2ca02749558f']::uuid[]),
    ('011cappa110@gmail.com', 'Jimmy', 'Rain', ARRAY['ed4723ea-7f3f-4558-9d24-1265773ae4b7', 'a03c75f0-d5c3-4689-9124-a787dd351fe8', '99e541c6-53ca-430d-9c8d-a122c5afda12']::uuid[]),
    ('01238.lol@gmail.com', 'max', 'max', ARRAY['bd7fc185-5f90-4fc1-912e-2f41ca77830d']::uuid[]),
    ('012hanspeter012@gmail.com', 'Adam', 'Eichhorn', ARRAY['bd7fc185-5f90-4fc1-912e-2f41ca77830d']::uuid[]),
    ('0135riku@gmail.com', '理功', '近藤', ARRAY['a03c75f0-d5c3-4689-9124-a787dd351fe8']::uuid[]),
    ('01734uhh@gmail.com', 'elian', 'honoret', ARRAY['bd7fc185-5f90-4fc1-912e-2f41ca77830d']::uuid[]),
    ('01920301@gmail.com', 'ded12esd2', '31312esd', ARRAY['bd7fc185-5f90-4fc1-912e-2f41ca77830d']::uuid[]),
    ('01gnome01@gmail.com', 'je&a', 'ffff', ARRAY['bd7fc185-5f90-4fc1-912e-2f41ca77830d']::uuid[]),
    ('02-boast-herd@icloud.com', 'kill', 'lucy', ARRAY['bd7fc185-5f90-4fc1-912e-2f41ca77830d']::uuid[]),
    ('0229mns2ooo@gmail.com', 'Y', 'S', ARRAY['bd7fc185-5f90-4fc1-912e-2f41ca77830d', 'ed4723ea-7f3f-4558-9d24-1265773ae4b7', 'a5a5e9e1-3392-484a-b48f-4aca71fbb122']::uuid[]),
    ('0253578@up.edu.mx', 'oak', 'popeye', ARRAY['068f019d-177d-4203-9e4a-27b75ea2926e']::uuid[]),
    ('02939796009benites@gmail.com', 'Angelo', 'Benites', ARRAY['bd7fc185-5f90-4fc1-912e-2f41ca77830d']::uuid[]),
    ('03037ri7ri@gmail.com', 'Masanari', 'Sato', ARRAY['a5a5e9e1-3392-484a-b48f-4aca71fbb122']::uuid[]),
    ('034produtoracontato@gmail.com', 'Charlie', 'Machado', ARRAY['bd7fc185-5f90-4fc1-912e-2f41ca77830d']::uuid[]),
    ('03biplane-treetop@icloud.com', 'kim', 'daene', ARRAY['43800acf-c5e1-4d1a-942f-bede7b3ff213', '34fd6bb0-410e-4aff-a01d-8083596e7098', 'f4177a27-bfd9-4ea1-be0b-2ca02749558f', '5fcd6aac-7ebb-4cab-bbd6-69f0b84598e5']::uuid[]),
    ('03masonn@gmail.com', 'amir', 'jackson', ARRAY['ed4723ea-7f3f-4558-9d24-1265773ae4b7']::uuid[]),
    ('03nateg59@gmail.com', 'Lux', 'Duveen', ARRAY['46aaabea-901f-4893-ad99-ea294b2914cc', 'a617d04c-13cb-403c-8e12-0dcf13603859', 'ed4723ea-7f3f-4558-9d24-1265773ae4b7', '8c9d3944-873e-4761-8601-f7cc5067a10f', 'd7cb3189-7e14-4386-afbf-cc2c6ad5cffa', '068f019d-177d-4203-9e4a-27b75ea2926e', 'bd7fc185-5f90-4fc1-912e-2f41ca77830d']::uuid[]),
    ('0411pcdaisuku@gmail.com', 'マサユキ', 'キリュウ', ARRAY['a03c75f0-d5c3-4689-9124-a787dd351fe8']::uuid[]),
    ('0413jaemin@naver.com', 'jeong', 'jm', ARRAY['43800acf-c5e1-4d1a-942f-bede7b3ff213', '34fd6bb0-410e-4aff-a01d-8083596e7098', 'f4177a27-bfd9-4ea1-be0b-2ca02749558f', '5fcd6aac-7ebb-4cab-bbd6-69f0b84598e5']::uuid[]),
    ('042clo@gmail.com', 'jordan', 'hall', ARRAY['bd7fc185-5f90-4fc1-912e-2f41ca77830d']::uuid[]),
    ('04oliverbryan@gmail.com', 'Oliver', 'Bryan', ARRAY['bd7fc185-5f90-4fc1-912e-2f41ca77830d']::uuid[]),
    ('04simi.storch@gmail.com', 'Simon', 'Storch', ARRAY['bd7fc185-5f90-4fc1-912e-2f41ca77830d']::uuid[]),
    ('05.mamba-mitts@icloud.com', 'Takuya', 'Shimizu', ARRAY['f4177a27-bfd9-4ea1-be0b-2ca02749558f']::uuid[]),
    ('05.murky-porgy@icloud.com', 'fhn', 'hersdh', ARRAY['bd7fc185-5f90-4fc1-912e-2f41ca77830d']::uuid[]),
    ('0505aidan@gmail.com', 'aidan', 'st john', ARRAY['bd7fc185-5f90-4fc1-912e-2f41ca77830d']::uuid[]),
    ('0531672546rl@gmail.com', 'Reo', 'Ishibashi', ARRAY['bd7fc185-5f90-4fc1-912e-2f41ca77830d', '28eece1b-df54-4593-82a7-e9a21d6c3fcb', 'a03c75f0-d5c3-4689-9124-a787dd351fe8', '99e541c6-53ca-430d-9c8d-a122c5afda12']::uuid[]),
    ('057kgnk2000@gmail.com', 'Akira', 'Yamaguchi', ARRAY['bd7fc185-5f90-4fc1-912e-2f41ca77830d']::uuid[]),
    ('05crag.grabs@icloud.com', 'Ragavan', 'Vijay', ARRAY['bd7fc185-5f90-4fc1-912e-2f41ca77830d']::uuid[]),
    ('05domdom26@gmail.com', 'Donminick', 'Coello', ARRAY['bd7fc185-5f90-4fc1-912e-2f41ca77830d']::uuid[]),
    ('06.mieten-gewebe@icloud.com', 'O', 'M', ARRAY['a03c75f0-d5c3-4689-9124-a787dd351fe8']::uuid[]),
    ('063ayvo@gmail.com', 'l', 'kj', ARRAY['bd7fc185-5f90-4fc1-912e-2f41ca77830d']::uuid[]),
    ('0659949@students.dadeschools.net', 'Jared', 'Pereira', ARRAY['bd7fc185-5f90-4fc1-912e-2f41ca77830d']::uuid[]);
    
    SELECT COUNT(*) INTO v_total FROM batch_data;
    
    FOR v_customer IN SELECT * FROM batch_data LOOP
        BEGIN
            INSERT INTO auth.users (
                id, instance_id, aud, role, email, encrypted_password,
                email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
            ) VALUES (
                gen_random_uuid(), '00000000-0000-0000-0000-000000000000'::uuid,
                'authenticated', 'authenticated', v_customer.email,
                crypt('Temp' || substr(md5(random()::text), 1, 8) || '!', gen_salt('bf')),
                NOW(), '{"provider":"email","providers":["email"]}'::jsonb,
                ('{"first_name":"' || v_customer.fname || '","last_name":"' || v_customer.lname || '"}')::jsonb,
                NOW(), NOW()
            ) ON CONFLICT (email) DO UPDATE SET updated_at = NOW() RETURNING id INTO v_user_id;
            
            IF v_user_id IS NULL THEN SELECT id INTO v_user_id FROM auth.users WHERE email = v_customer.email; END IF;
            
            UPDATE profiles SET first_name = v_customer.fname, last_name = v_customer.lname,
                full_name = v_customer.fname || ' ' || v_customer.lname, updated_at = NOW() WHERE id = v_user_id;
            
            FOREACH v_product_id IN ARRAY v_customer.pids LOOP
                INSERT INTO product_grants (user_email, product_id, granted_at, notes, created_at, updated_at)
                VALUES (v_customer.email, v_product_id, NOW(), 'Migrated from WooCommerce', NOW(), NOW())
                ON CONFLICT (user_email, product_id) DO NOTHING;
            END LOOP;
            
            v_success := v_success + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Error: % - %', v_customer.email, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Done: % of % imported', v_success, v_total;
END $$;
