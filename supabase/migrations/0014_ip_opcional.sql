-- La IP del cliente solo se toma de la cabecera que fija el reverse proxy de confianza
-- (CABECERA_IP_CONFIABLE). Sin ella la IP es desconocida: el pedido de recuperación se
-- registra igual (cuenta para el límite por email) con ip null, y no se limita por IP.
alter table pedidos_recuperacion alter column ip drop not null;
