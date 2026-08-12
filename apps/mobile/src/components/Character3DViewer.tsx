import type { ItemDto, ItemSlot } from "@mypetproj/shared";
// Импорт напрямую из подмодуля, а не из общего "barrel"-экспорта @react-three/drei:
// полный index.js тянет за собой десятки внутренних компонентов (включая tunnel-rat,
// который требует zustand v4 с именованным экспортом create — конфликтует с zustand v3,
// нужным @react-three/fiber). OrbitControls сам по себе зависит только от three-stdlib.
import { OrbitControls } from "@react-three/drei/core/OrbitControls";
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { spacing, typography } from "../theme/tokens";

interface Character3DViewerProps {
  characterId: string;
  equipped: Record<ItemSlot, ItemDto | null>;
}

/**
 * Веб-версия 3D-просмотра персонажа (three.js через @react-three/fiber).
 * Это НЕ лицензированная модель выбранного героя (Иллидана/Геральта и т.д.) —
 * таких 3D-ассетов взять неоткуда без нарушения авторских прав, поэтому это
 * обобщённая гуманоидная фигура, чей цвет зависит от выбранного персонажа, а
 * экипировка (меч/броня/кольцо/ожерелье/трофей) навешивается по слотам.
 * Нативная (iOS/Android) версия не реализована — там остаётся плоский
 * портрет, см. CharacterPortrait.
 */

// Стабильный (не рандомный при каждом рендере), но не привязанный к лицензированному
// образу цвет — просто чтобы выбор персонажа был заметен на модели.
function colorForCharacter(id: string): string {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return `hsl(${hash % 360}, 55%, 45%)`;
}

function HumanoidModel({ characterId, equipped }: Character3DViewerProps) {
  const bodyColor = useMemo(() => colorForCharacter(characterId), [characterId]);
  const hasArmor = Boolean(equipped.ARMOR);
  const hasWeapon = Boolean(equipped.WEAPON);
  const hasRing = Boolean(equipped.RING);
  const hasNecklace = Boolean(equipped.NECKLACE);
  const hasTrinket = Boolean(equipped.TRINKET);

  return (
    <group position={[0, -1.1, 0]}>
      <mesh position={[0, 2.1, 0]}>
        <sphereGeometry args={[0.28, 24, 24]} />
        <meshStandardMaterial color="#e8c39e" />
      </mesh>

      <mesh position={[0, 1.4, 0]}>
        <capsuleGeometry args={[0.35, 0.7, 8, 16]} />
        <meshStandardMaterial
          color={hasArmor ? "#8a8f98" : bodyColor}
          metalness={hasArmor ? 0.6 : 0.1}
          roughness={hasArmor ? 0.3 : 0.8}
        />
      </mesh>

      <mesh position={[-0.55, 1.4, 0]} rotation={[0, 0, 0.25]}>
        <capsuleGeometry args={[0.12, 0.7, 8, 16]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>
      <mesh position={[0.55, 1.4, 0]} rotation={[0, 0, -0.25]}>
        <capsuleGeometry args={[0.12, 0.7, 8, 16]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>

      <mesh position={[-0.2, 0.4, 0]}>
        <capsuleGeometry args={[0.15, 0.8, 8, 16]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
      <mesh position={[0.2, 0.4, 0]}>
        <capsuleGeometry args={[0.15, 0.8, 8, 16]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>

      {hasWeapon ? (
        <group position={[0.75, 1.0, 0]} rotation={[0, 0, -0.3]}>
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[0.06, 0.8, 0.06]} />
            <meshStandardMaterial color="#cfd6dd" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.15, 0]}>
            <boxGeometry args={[0.14, 0.12, 0.14]} />
            <meshStandardMaterial color="#7a5230" />
          </mesh>
        </group>
      ) : null}

      {hasRing ? (
        <mesh position={[0.75, 0.65, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.08, 0.02, 8, 16]} />
          <meshStandardMaterial color="#f5c518" metalness={0.9} roughness={0.1} />
        </mesh>
      ) : null}

      {hasNecklace ? (
        <mesh position={[0, 1.75, 0.25]} rotation={[Math.PI / 2.4, 0, 0]}>
          <torusGeometry args={[0.2, 0.02, 8, 24]} />
          <meshStandardMaterial color="#4fa8e0" metalness={0.6} roughness={0.3} />
        </mesh>
      ) : null}

      {hasTrinket ? (
        <mesh position={[0, 1.05, 0.4]}>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshStandardMaterial color="#7cff6b" emissive="#7cff6b" emissiveIntensity={0.8} />
        </mesh>
      ) : null}
    </group>
  );
}

export function Character3DViewer({ characterId, equipped }: Character3DViewerProps) {
  const { theme } = useTheme();
  const styles = useStyles();

  return (
    <View style={styles.wrapper}>
      <View style={styles.canvasBox}>
        <Canvas camera={{ position: [0, 1.2, 3.4], fov: 40 }} gl={{ alpha: true }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[3, 5, 2]} intensity={1} />
          <directionalLight position={[-3, 2, -2]} intensity={0.3} />
          <HumanoidModel characterId={characterId} equipped={equipped} />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            minPolarAngle={Math.PI / 2.3}
            maxPolarAngle={Math.PI / 2.3}
          />
        </Canvas>
      </View>
      <Text style={styles.hint}>Зажми левую кнопку мыши на модели и потяни влево-вправо, чтобы покрутить</Text>
    </View>
  );
}

function useStyles() {
  const { theme } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        wrapper: { alignItems: "center", marginBottom: spacing.md },
        canvasBox: {
          width: "70%",
          maxWidth: 340,
          height: 320,
          borderWidth: 3,
          borderColor: theme.colors.primary,
          backgroundColor: theme.colors.surface,
          overflow: "hidden",
          ...theme.hardShadow,
        },
        hint: { fontSize: 11, color: theme.colors.muted, marginTop: spacing.xs, textAlign: "center" },
      }),
    [theme],
  );
}
