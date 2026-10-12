-- El límite de login cuenta los fallidos por (email, IP) cuando la IP es conocida, así un
-- tercero desde otra IP no traba la cuenta de su dueño. Índice para esa consulta.
create index idx_intentos_login_email_ip on intentos_login (email_hash, ip, creado_en);
