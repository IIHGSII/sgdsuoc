-- Informe de Débitos de Sistework del 02/11/2026, rubro 331 (F.F. 10).
UPDATE `partidas_presupuesto`
SET `plan_financiero` = 206637826, `fecha_informe` = '2026-11-02'
WHERE `anio` = 2026 AND `objeto_gasto` = 331 AND `fuente` = 10;

INSERT INTO `debitos_presupuesto` (`partida_id`, `cdp`, `codigo_contratacion`, `concepto`, `tipo`, `prevision`, `compromiso`)
SELECT p.`id`, d.cdp, d.codigo, d.concepto, d.tipo, d.monto, d.monto
FROM `partidas_presupuesto` p
CROSS JOIN (
    SELECT 90001 AS cdp, NULL AS codigo, 'Reserva presupuestaria de compromiso 2026' AS concepto, 'Reservas' AS tipo, 4928600 AS monto
    UNION ALL SELECT 6954, 'AM-12008-22-14532', 'Certificación de saldo del código de contratación', 'Declaración jurada', 20317440
    UNION ALL SELECT 6958, 'AM-12008-23-19826', 'Certificación de saldo del código de contratación', 'Declaración jurada', 31834600
    UNION ALL SELECT 6970, 'AM-12008-25-56047', 'Certificación de saldo del código de contratación', 'Declaración jurada', 1683591
    UNION ALL SELECT 6998, 'AM-12008-25-46806', 'Certificación de saldo del código de contratación', 'Declaración jurada', 40698000
    UNION ALL SELECT 6961, 'AM-12008-23-25095', 'Certificación de saldo del código de contratación', 'Declaración jurada', 30669440
    UNION ALL SELECT 6966, 'AM-12008-25-46604', 'Certificación de saldo del código de contratación', 'Declaración jurada', 4490300
    UNION ALL SELECT 7000, 'AM-12008-25-53798', 'Certificación de saldo del código de contratación', 'Declaración jurada', 16133600
) d
WHERE p.`anio` = 2026 AND p.`objeto_gasto` = 331 AND p.`fuente` = 10;
