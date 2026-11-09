-- 0005 Seed — productos ficticios + usuarios de prueba (matriz de roles 5.7.1)
-- IMPORTANTE: auth.users requiere '' (no NULL) en columnas token/change;
-- con NULL, GoTrue falla el login con "converting NULL to string is unsupported".

create extension if not exists pgcrypto with schema extensions;

insert into public.productos (referencia, nombre, precio, existencias) values
  ('JAB-001', 'Jabon en barra 125 g', 2800, 120),
  ('JAB-002', 'Jabon liquido 500 ml', 6900, 80),
  ('DET-001', 'Detergente en polvo 1 kg', 9500, 60),
  ('DET-002', 'Lavavajillas liquido 750 ml', 7800, 45),
  ('DES-001', 'Suavizante 1 L', 8200, 70),
  ('CLN-001', 'Limpipiso multiusos 1 L', 6500, 55),
  ('CLN-002', 'Lejia 1 L', 3900, 90),
  ('PAP-001', 'Papel higienico x4 rollos', 5600, 150),
  ('PAP-002', 'Servilletas x100', 3200, 200),
  ('DOM-001', 'Esponja x3 unidades', 4100, 110),
  ('CER-001', 'Cera para piso 500 ml', 8900, 35),
  ('SHM-001', 'Shampoo 400 ml', 12500, 40),
  ('CRE-001', 'Crema dental 100 g', 5400, 65),
  ('AFE-001', 'Maquina de afeitar x5 repuestos', 11200, 30),
  ('PAN-001', 'Pan rebanado 500 g', 4500, 25)
on conflict (referencia) do nothing;

do $$
begin
  if not exists (select 1 from auth.users where email = 'admin@ladorada.test') then
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                            email_confirmed_at, confirmation_sent_at,
                            confirmation_token, recovery_token,
                            email_change, email_change_token_new, email_change_token_current,
                            phone_change, phone_change_token, reauthentication_token,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
            'admin@ladorada.test', crypt('Admin1234*', gen_salt('bf')), now(), now(),
            '', '', '', '', '', '', '', '',
            '{"provider":"email","providers":["email"],"rol":"admin"}'::jsonb,
            '{"nombre":"Gerente Administrador"}'::jsonb, now(), now());
  end if;

  if not exists (select 1 from auth.users where email = 'vendedor@ladorada.test') then
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                            email_confirmed_at, confirmation_sent_at,
                            confirmation_token, recovery_token,
                            email_change, email_change_token_new, email_change_token_current,
                            phone_change, phone_change_token, reauthentication_token,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
            'vendedor@ladorada.test', crypt('Vende1234*', gen_salt('bf')), now(), now(),
            '', '', '', '', '', '', '', '',
            '{"provider":"email","providers":["email"],"rol":"vendedor"}'::jsonb,
            '{"nombre":"Vendedor Pruebas"}'::jsonb, now(), now());
  end if;

  if not exists (select 1 from auth.users where email = 'bodega@ladorada.test') then
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                            email_confirmed_at, confirmation_sent_at,
                            confirmation_token, recovery_token,
                            email_change, email_change_token_new, email_change_token_current,
                            phone_change, phone_change_token, reauthentication_token,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
            'bodega@ladorada.test', crypt('Bode1234*', gen_salt('bf')), now(), now(),
            '', '', '', '', '', '', '', '',
            '{"provider":"email","providers":["email"],"rol":"bodega"}'::jsonb,
            '{"nombre":"Encargada de Bodega"}'::jsonb, now(), now());
  end if;

  if not exists (select 1 from auth.users where email = 'prueba@ladorada.test') then
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                            email_confirmed_at, confirmation_sent_at,
                            confirmation_token, recovery_token,
                            email_change, email_change_token_new, email_change_token_current,
                            phone_change, phone_change_token, reauthentication_token,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
            'prueba@ladorada.test', crypt('Prueba1234*', gen_salt('bf')), now(), now(),
            '', '', '', '', '', '', '', '',
            '{"provider":"email","providers":["email"],"rol":"vendedor"}'::jsonb,
            '{"nombre":"Usuario de Pruebas"}'::jsonb, now(), now());
  end if;

  insert into auth.identities (id, user_id, provider_id, provider, identity_data,
                               last_sign_in_at, created_at, updated_at)
  select gen_random_uuid(), u.id, u.id::text, 'email',
         jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
         now(), now(), now()
  from auth.users u
  where u.email like '%@ladorada.test'
    and not exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email');
end $$;
