-- CreateTable
CREATE TABLE `partidas_presupuesto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `anio` INTEGER NOT NULL,
    `objeto_gasto` INTEGER NOT NULL,
    `fuente` INTEGER NOT NULL,
    `descripcion` VARCHAR(191) NOT NULL,
    `aprobado` DECIMAL(15, 2) NOT NULL,

    UNIQUE INDEX `partidas_presupuesto_anio_objeto_gasto_fuente_key`(`anio`, `objeto_gasto`, `fuente`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Presupuesto aprobado 2026 (PGN), Actividad 23, Unidad Responsable 41.
-- Solo los rubros que le interesan a la SUOC: quedan fuera el grupo 100
-- (Recursos Humanos) y el 361 (Combustibles), por decisión del usuario.
INSERT INTO `partidas_presupuesto` (`anio`, `objeto_gasto`, `fuente`, `descripcion`, `aprobado`) VALUES
    (2026, 245, 10, 'Servicios de Limpieza, Aseo y Fumigación', 1147548516),
    (2026, 311, 10, 'Alimentos para Personas', 972503140),
    (2026, 321, 30, 'Hilados y Telas', 158400000),
    (2026, 331, 10, 'Papel de Escritorio y Cartón', 6637826),
    (2026, 341, 30, 'Elementos de Limpieza', 128700000),
    (2026, 342, 10, 'Útiles de Escritorio, Oficina y Enseres', 61408915);
