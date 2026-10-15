import { useState } from 'react';
import type { Observation } from '../types/api';
import { getApiErrorMessage } from '../utils/errors';

const CONDITIONS = ['Excelente', 'Bom', 'Regular', 'Ruim'];

function toDateInputValue(dateStr?: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export default function ObservationFormModal({
  initial,
  onClose,
  onSubmit,
}: {
  initial: Observation | null;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const isEdit = Boolean(initial?._id);

  const [object, setObject] = useState(initial?.object || '');
  const [date, setDate] = useState(
    toDateInputValue(initial?.date) || new Date().toISOString().slice(0, 10),
  );
  const [equipment, setEquipment] = useState(initial?.equipment || '');
  const [conditions, setConditions] = useState(initial?.conditions || 'Bom');
  const [location, setLocation] = useState(initial?.location?.name || '');
  const [notes, setNotes] = useState(initial?.notes || '');
  const [photo, setPhoto] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!object || !date || !equipment || !conditions) {
      setError('Preencha objeto, data, equipamento e condições.');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = { object, date, equipment, conditions, location, notes };
      if (photo) payload.photo = photo;
      if (isEdit && removePhoto && !photo) payload.removePhoto = 'true';
      await onSubmit(payload);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erro ao salvar observação.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={undefined}
      role="presentation"
    >
      <div className="modal-card">
        <h2>{isEdit ? 'Editar observação' : 'Nova observação'}</h2>
        <p className="modal-sub">
          {isEdit ? 'Atualize os detalhes do seu registro.' : 'Registre o que você observou hoje.'}
        </p>

        {error && <div className="auth-alert">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="object">Objeto observado</label>
            <input
              id="object"
              value={object}
              onChange={(e) => setObject(e.target.value)}
              placeholder="Ex: Lua, Júpiter, M31..."
            />
          </div>

          <div className="form-row">
            <div className="field">
              <label htmlFor="date">Data</label>
              <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="conditions">Condições do céu</label>
              <select id="conditions" value={conditions} onChange={(e) => setConditions(e.target.value)}>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="equipment">Equipamento</label>
            <input
              id="equipment"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              placeholder='Ex: Telescópio Dobsoniano 8", Binóculo 10x50...'
            />
          </div>

          <div className="field">
            <label htmlFor="location">Local</label>
            <input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: Florianópolis, SC"
            />
          </div>

          <div className="field">
            <label htmlFor="notes">Notas</label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalhes da observação..."
            />
          </div>

          <div className="field">
            <label htmlFor="photo">Foto (opcional)</label>
            <label className="field-file" htmlFor="photo">
              {photo ? photo.name : 'Clique para escolher uma imagem (JPG, PNG, WebP — máx. 5MB)'}
              <input
                id="photo"
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={(e) => setPhoto(e.target.files?.[0] || null)}
              />
            </label>
            {isEdit && initial?.photo?.url && !photo && (
              <div className="current-photo-note">
                <label>
                  <input
                    type="checkbox"
                    checked={removePhoto}
                    onChange={(e) => setRemovePhoto(e.target.checked)}
                  />{' '}
                  Remover foto atual
                </label>
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Registrar observação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
