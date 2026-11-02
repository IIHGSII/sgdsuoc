-- Informe de Débitos de Sistework del 02/11/2026, rubro 321 (F.F. 30).
UPDATE `partidas_presupuesto`
SET `plan_financiero` = 58400000, `fecha_informe` = '2026-11-02'
WHERE `anio` = 2026 AND `objeto_gasto` = 321 AND `fuente` = 30;

INSERT INTO `debitos_presupuesto` (`partida_id`, `cdp`, `codigo_contratacion`, `concepto`, `tipo`, `prevision`, `compromiso`)
SELECT `id`, 7166, NULL, 'Adquisición de telas para el Hospital General de Luque', 'Llamados', 58400000, 58400000
FROM `partidas_presupuesto` WHERE `anio` = 2026 AND `objeto_gasto` = 321 AND `fuente` = 30;
