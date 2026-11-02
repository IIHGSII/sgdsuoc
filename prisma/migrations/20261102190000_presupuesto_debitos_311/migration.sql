-- Informe de Débitos de Sistework del 02/11/2026, rubro 311 (F.F. 10).
UPDATE `partidas_presupuesto`
SET `plan_financiero` = 972503140, `fecha_informe` = '2026-11-02'
WHERE `anio` = 2026 AND `objeto_gasto` = 311 AND `fuente` = 10;

INSERT INTO `debitos_presupuesto` (`partida_id`, `cdp`, `codigo_contratacion`, `concepto`, `tipo`, `prevision`, `compromiso`)
SELECT p.`id`, d.cdp, d.codigo, d.concepto, d.tipo, d.monto, d.monto
FROM `partidas_presupuesto` p
CROSS JOIN (
    SELECT 100800 AS cdp, 'AM-12008-25-54121' AS codigo, 'Certificación de saldo del código de contratación' AS concepto, 'Declaración jurada' AS tipo, 18000000 AS monto
    UNION ALL SELECT 100627, 'AM-12008-25-46654', 'Certificación de saldo del código de contratación', 'Declaración jurada', 15900000
    UNION ALL SELECT 100628, 'AM-12008-25-45426', 'Certificación de saldo del código de contratación', 'Declaración jurada', 7350000
    UNION ALL SELECT 102184, 'AM-12008-25-58579', 'Certificación de saldo del código de contratación', 'Declaración jurada', 22700000
    UNION ALL SELECT 4223, NULL, 'Convenio Marco, ID de pedido 59182', 'Convenio Marco', 10250000
    UNION ALL SELECT 100219, 'AM-12008-25-50994', 'Certificación de saldo del código de contratación', 'Declaración jurada', 10240000
    UNION ALL SELECT 100266, 'AM-12008-25-48319', 'Certificación de saldo del código de contratación', 'Declaración jurada', 13219000
    UNION ALL SELECT 100434, 'AM-12008-25-52377', 'Certificación de saldo del código de contratación', 'Declaración jurada', 3250000
    UNION ALL SELECT 100503, 'AM-12008-25-48318', 'Certificación de saldo del código de contratación', 'Declaración jurada', 16200000
    UNION ALL SELECT 101126, 'AM-12008-25-52375', 'Certificación de saldo del código de contratación', 'Declaración jurada', 29450000
    UNION ALL SELECT 101129, 'AM-12008-25-50991', 'Certificación de saldo del código de contratación', 'Declaración jurada', 1775000
    UNION ALL SELECT 101627, 'AM-12008-25-53799', 'Certificación de saldo del código de contratación', 'Declaración jurada', 3540000
    UNION ALL SELECT 101631, 'AM-12008-25-54122', 'Certificación de saldo del código de contratación', 'Declaración jurada', 1000000
    UNION ALL SELECT 101763, 'AM-12008-25-53801', 'Certificación de saldo del código de contratación', 'Declaración jurada', 2600000
    UNION ALL SELECT 101992, 'LP-12008-21-205796', 'Certificación de saldo del código de contratación', 'Declaración jurada', 861000
    UNION ALL SELECT 102007, 'AM-12008-25-54123', 'Certificación de saldo del código de contratación', 'Declaración jurada', 15855000
    UNION ALL SELECT 2773, NULL, 'Convenio Marco, ID de pedido 57394', 'Convenio Marco', 78240000
    UNION ALL SELECT 102324, 'AM-12008-25-56877', 'Certificación de saldo del código de contratación', 'Declaración jurada', 104885000
    UNION ALL SELECT 102474, 'AM-12008-25-58581', 'Certificación de saldo del código de contratación', 'Declaración jurada', 35435000
    UNION ALL SELECT 4664, NULL, 'Convenio Marco, ID de pedido 59742', 'Convenio Marco', 7225000
    UNION ALL SELECT 4228, 'AM-12008-25-59053', 'Certificación de saldo del código de contratación', 'Declaración jurada', 16050000
    UNION ALL SELECT 4784, NULL, 'Convenio Marco, ID de pedido 59990', 'Convenio Marco', 100150000
    UNION ALL SELECT 5387, NULL, 'Convenio Marco, ID de pedido 60705', 'Convenio Marco', 10400000
    UNION ALL SELECT 5482, NULL, 'CM', 'Convenio Marco', 6740000
    UNION ALL SELECT 102771, 'AM-12008-25-52376', 'Certificación de código de contratación', 'Declaración jurada', 63900000
    UNION ALL SELECT 5860, 'LP-12008-21-205796', 'Certificación del PAC plurianual N° 395430: adquisición de productos alimenticios para el Hospital General de Luque', 'Plurianual', 778500
    UNION ALL SELECT 5882, NULL, 'Convenio Marco, ID de pedido 61609', 'Convenio Marco', 92100000
    UNION ALL SELECT 8074, 'LP-12008-18-155861', 'Certificado de cumplimiento PAC N° 322.754, LPN 04/2017, proveedor FEDAGRO', 'Cumplimiento', 33545000
    UNION ALL SELECT 7760, NULL, 'Convenio Marco, ID de pedido 64296', 'Convenio Marco', 94515000
    UNION ALL SELECT 7874, NULL, 'Convenio Marco, ID de pedido 64719', 'Convenio Marco', 14500000
    UNION ALL SELECT 90001, NULL, 'Reserva presupuestaria de compromiso 2026', 'Reservas', 78730425
) d
WHERE p.`anio` = 2026 AND p.`objeto_gasto` = 311 AND p.`fuente` = 10;
