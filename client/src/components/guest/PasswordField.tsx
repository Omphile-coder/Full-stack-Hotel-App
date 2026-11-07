import { Eye, EyeOff } from 'lucide-react';
import { useId, useState } from 'react';

/** Give each password field an independent visibility toggle and a native label. */
export function PasswordField({ label, name = 'password', newPassword = false }: {
  label: string;
  name?: string;
  newPassword?: boolean;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return <div className="field">
    <label htmlFor={id}>{label}</label>
    <div className="password-input">
      <input id={id} name={name} type={visible ? 'text' : 'password'} required
        autoComplete={newPassword ? 'new-password' : 'current-password'}
        minLength={newPassword ? 15 : undefined} maxLength={128} />
      <button type="button" aria-controls={id} aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} onClick={() => setVisible(!visible)}>
        {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </div>
  </div>;
}
