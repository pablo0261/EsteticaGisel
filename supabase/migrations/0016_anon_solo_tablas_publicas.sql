-- anon solo conserva el SELECT de las tablas con lectura pública, y nadie puede invocar por
-- RPC las funciones auxiliares que quedaron sin uso.
--
-- Hasta acá anon tenía SELECT en todas las tablas de public y RLS sin policy le devolvía 0
-- filas. Funciona, pero depende de que nunca se agregue por error una policy "to public" o
-- "to anon" en una tabla privada. Sin el privilegio, la API responde "permission denied".
--
-- Tablas con policy para anon (consultado en pg_policies antes de escribir esto) y que
-- conservan el SELECT: servicios, cursos, testimonios, tenants, tenant_marca.
-- Todas las demás tablas de public quedan sin ningún privilegio para anon. Las del login
-- (codigos_login, dispositivos_confiables, pedidos_recuperacion, intentos_login) ya no lo
-- tenían (0011, 0013); se repiten para que la lista quede completa.

revoke all on
  public.perfiles,
  public.pagos,
  public.turnos,
  public.tenant_credenciales,
  public.intentos_reserva,
  public.recordatorios_enviados,
  public.configuracion_negocio,
  public.accesos_curso,
  public.archivos_curso,
  public.migraciones_aplicadas,
  public.codigos_login,
  public.dispositivos_confiables,
  public.pedidos_recuperacion,
  public.intentos_login
from anon;

-- Red de seguridad: anon solo puede tener privilegios sobre las tablas públicas.
do $$
begin
  if exists (
    select 1 from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'anon'
      and table_name not in ('servicios', 'cursos', 'testimonios', 'tenants', 'tenant_marca')
  ) then
    raise exception 'anon conserva privilegios sobre una tabla privada de public';
  end if;
end $$;

-- tenant_actual() y es_master() quedaron sin uso con la 0012 (solo las usaban las policies
-- de authenticated): sin EXECUTE, PostgREST no las expone como RPC. tenant_activo() se
-- conserva: la usan las policies de lectura anónima, que corren con los privilegios de anon.
revoke execute on function public.tenant_actual() from public, anon, authenticated;
revoke execute on function public.es_master() from public, anon, authenticated;
