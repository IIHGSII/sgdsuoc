-- CreateTable
CREATE TABLE `reprogramaciones_presupuesto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `anio` INTEGER NOT NULL,
    `fuente` INTEGER NOT NULL,
    `objeto_origen` INTEGER NOT NULL,
    `objeto_destino` INTEGER NOT NULL,
    `monto` DECIMAL(15, 2) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Reprogramaciones 2026 indicadas por el responsable de la SUOC el 02/11/2026.
INSERT INTO `reprogramaciones_presupuesto` (`anio`, `fuente`, `objeto_origen`, `objeto_destino`, `monto`) VALUES
    (2026, 30, 321, 341, 100000000),
    (2026, 10, 245, 331, 197849085),
    (2026, 10, 245, 341, 65462977),
    (2026, 10, 342, 331, 2150915);
