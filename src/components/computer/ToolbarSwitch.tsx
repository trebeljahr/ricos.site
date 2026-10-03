import { useId } from "react";
import styles from "./CircuitToolbar.module.css";

type ToolbarSwitchProps = {
  label: string;
  offLabel: string;
  onLabel: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
};

export function ToolbarSwitch({
  label,
  offLabel,
  onLabel,
  checked,
  onChange,
  description,
}: ToolbarSwitchProps) {
  const id = useId();
  return (
    <div className={styles.setting}>
      <span className={styles.settingLabel} id={`${id}-label`}>
        {label}
      </span>
      <label className={styles.switchRow}>
        <span data-active={!checked}>{offLabel}</span>
        <input
          type="checkbox"
          role="switch"
          aria-checked={checked}
          aria-labelledby={`${id}-label`}
          aria-describedby={description ? `${id}-description` : undefined}
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span data-active={checked}>{onLabel}</span>
      </label>
      {description && <small id={`${id}-description`}>{description}</small>}
    </div>
  );
}
