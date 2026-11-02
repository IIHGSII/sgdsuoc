-- Informe de Débitos de Sistework del 02/11/2026, rubro 342 (F.F. 10).
UPDATE `partidas_presupuesto`
SET `plan_financiero` = 59258000, `fecha_informe` = '2026-11-02'
WHERE `anio` = 2026 AND `objeto_gasto` = 342 AND `fuente` = 10;

INSERT INTO `debitos_presupuesto` (`partida_id`, `cdp`, `codigo_contratacion`, `concepto`, `tipo`, `prevision`, `compromiso`)
SELECT `id`, 102969, 'AM-12008-25-46605', 'Certificación de saldo del código de contratación', 'Declaración jurada', 59258000, 59258000
FROM `partidas_presupuesto` WHERE `anio` = 2026 AND `objeto_gasto` = 342 AND `fuente` = 10;
