// Centralized measurement field definitions
// Used across all measurement-related components

export interface MeasurementFieldDef {
  key: string;
  label: string;
}

// All available measurement fields
export const measurementFields: MeasurementFieldDef[] = [
  { key: "full_length", label: "Full Length" },
  { key: "blouse_length", label: "Blouse Length" },
  { key: "shoulder", label: "Shoulder" },
  { key: "bust", label: "Bust" },
  { key: "waist_round", label: "Waist" },
  { key: "yoke_length", label: "Yoke Length" },
  { key: "yoke_round", label: "Yoke Round" },
  { key: "slit_length", label: "Slit Length" },
  { key: "slit_width", label: "Slit Width" },
  { key: "stomach_length", label: "Stomach Length" },
  { key: "stomach_round", label: "Stomach Round" },
  { key: "bust_point_length", label: "Bust Point Length" },
  { key: "bust_distance", label: "Bust Distance" },
  { key: "fc", label: "FC" },
  { key: "bc", label: "BC" },
  { key: "sleeve_round", label: "Sleeve Round" },
  { key: "bicep_round", label: "Bicep Round" },
  { key: "armhole", label: "Armhole" },
  { key: "shoulder_balance", label: "Shoulder Balance" },
  { key: "front_neck_depth", label: "Front Neck Depth" },
  { key: "back_neck_depth", label: "Back Neck Depth" },
  { key: "collar_round", label: "Collar Round" },
  { key: "bottom_length", label: "Bottom Length" },
  { key: "skirt_length", label: "Skirt Length" },
  { key: "hip_round", label: "Hip Round" },
  { key: "seat_round", label: "Seat Round" },
  { key: "thigh_round", label: "Thigh Round" },
  { key: "knee_round", label: "Knee Round" },
  { key: "ankle_round", label: "Ankle Round" },
];

// Template fields for settings - includes enabled flag
export const allPossibleTemplateFields = measurementFields.map(f => ({
  ...f,
  name: f.key,
  enabled: true,
}));

// Get default fields for a new template (first 10)
export const getDefaultTemplateFields = () => allPossibleTemplateFields.slice(0, 10);
