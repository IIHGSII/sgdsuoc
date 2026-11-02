-- Informe de Débitos de Sistework del 02/11/2026, rubro 341.
-- La F.F. 10 no figura en el PGN 2026 (aprobado 0): su plan financiero viene de reprogramaciones.
INSERT INTO `partidas_presupuesto` (`anio`, `objeto_gasto`, `fuente`, `descripcion`, `aprobado`, `plan_financiero`, `fecha_informe`)
VALUES (2026, 341, 10, 'Elementos de Limpieza', 0, 65462977, '2026-11-02');

UPDATE `partidas_presupuesto`
SET `plan_financiero` = 228700000, `fecha_informe` = '2026-11-02'
WHERE `anio` = 2026 AND `objeto_gasto` = 341 AND `fuente` = 30;

INSERT INTO `debitos_presupuesto` (`partida_id`, `cdp`, `codigo_contratacion`, `concepto`, `tipo`, `prevision`, `compromiso`)
SELECT `id`, 4261, 'AM-12008-25-55558', 'Certificación de saldo del código de contratación', 'Declaración jurada', 2883500, 2883500
FROM `partidas_presupuesto` WHERE `anio` = 2026 AND `objeto_gasto` = 341 AND `fuente` = 10;

INSERT INTO `debitos_presupuesto` (`partida_id`, `cdp`, `codigo_contratacion`, `concepto`, `tipo`, `prevision`, `compromiso`)
SELECT p.`id`, d.cdp, d.codigo, d.concepto, d.tipo, d.monto, d.monto
FROM `partidas_presupuesto` p
CROSS JOIN (
    SELECT 100874 AS cdp, 'AM-12008-25-46412' AS codigo, 'Certificación de saldo del código de contratación' AS concepto, 'Declaración jurada' AS tipo, 540000 AS monto
    UNION ALL SELECT 100024, 'AM-12008-25-46923', 'Certificación de saldo del código de contratación', 'Declaración jurada', 8544000
    UNION ALL SELECT 100078, 'AM-12008-25-48417', 'Certificación de saldo del código de contratación', 'Declaración jurada', 23330000
    UNION ALL SELECT 100225, 'AM-12008-25-50123', 'Certificación de saldo del código de contratación', 'Declaración jurada', 5600000
    UNION ALL SELECT 100273, 'AM-12008-25-48323', 'Certificación de saldo del código de contratación', 'Declaración jurada', 22020000
    UNION ALL SELECT 100274, 'AM-12008-25-47418', 'Certificación de saldo del código de contratación', 'Declaración jurada', 14820000
    UNION ALL SELECT 101585, 'AM-12008-25-46647', 'Certificación de saldo del código de contratación', 'Declaración jurada', 6250000
    UNION ALL SELECT 100893, 'AM-12008-25-46649', 'Certificación de saldo del código de contratación', 'Declaración jurada', 2375000
    UNION ALL SELECT 101189, 'AM-12008-25-50122', 'Certificación de saldo del código de contratación', 'Declaración jurada', 1260000
    UNION ALL SELECT 101535, 'AM-12008-25-46410', 'Certificación de saldo del código de contratación', 'Declaración jurada', 5700000
    UNION ALL SELECT 101571, 'AM-12008-25-54125', 'Certificación de saldo del código de contratación', 'Declaración jurada', 3700000
    UNION ALL SELECT 101582, 'AM-12008-25-46413', 'Certificación de saldo del código de contratación', 'Declaración jurada', 1470000
    UNION ALL SELECT 101583, 'AM-12008-25-48320', 'Certificación de saldo del código de contratación', 'Declaración jurada', 1065000
    UNION ALL SELECT 102389, 'AM-12008-25-46411', 'Certificación de saldo del código de contratación', 'Declaración jurada', 2560000
    UNION ALL SELECT 102390, 'AM-12008-25-48322', 'Certificación de saldo del código de contratación', 'Declaración jurada', 1375000
    UNION ALL SELECT 102421, 'AM-12008-25-48853', 'Certificado de saldo del código de contratación', 'Declaración jurada', 3000000
    UNION ALL SELECT 3727, NULL, 'Convenio Marco, ID de pedido 58961', 'Convenio Marco', 4250000
    UNION ALL SELECT 4035, NULL, 'Convenio Marco, ID de pedido 58962', 'Convenio Marco', 14250000
    UNION ALL SELECT 4036, NULL, 'Convenio Marco, ID de pedido 58963', 'Convenio Marco', 11150000
    UNION ALL SELECT 5154, NULL, 'Convenio Marco, ID de pedido 60336', 'Convenio Marco', 53750000
    UNION ALL SELECT 5597, NULL, 'Convenio Marco, ID de pedido 60978', 'Convenio Marco', 17490000
    UNION ALL SELECT 102942, 'AM-12008-25-46925', 'Certificación de saldo del código de contratación', 'Declaración jurada', 3240000
    UNION ALL SELECT 90001, NULL, 'Reserva presupuestaria de compromiso 2026', 'Reservas', 14946000
) d
WHERE p.`anio` = 2026 AND p.`objeto_gasto` = 341 AND p.`fuente` = 30;
