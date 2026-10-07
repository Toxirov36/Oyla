import { useId, type Ref } from 'react';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';

export interface ComboboxOption {
  value: string;
  label: string;
}
export function ComboboxField({
  options,
  value,
  onChange,
  onBlur,
  inputRef,
  id,
  name,
  label,
  placeholder = 'Tanlang yoki qidiring…',
  disabled = false,
  invalid = false,
  describedBy,
}: {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  inputRef?: Ref<HTMLInputElement>;
  id?: string;
  name?: string;
  label: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
}) {
  const generatedId = useId();
  return (
    <Combobox
      items={options}
      value={options.find((option) => option.value === value) || null}
      onValueChange={(option) => onChange(option?.value || '')}
      itemToStringLabel={(option) => option.label}
      itemToStringValue={(option) => option.value}
      isItemEqualToValue={(a, b) => a.value === b.value}
      autoHighlight
      disabled={disabled}
      name={name}
    >
      <ComboboxInput
        id={id || generatedId}
        ref={inputRef}
        onBlur={onBlur}
        aria-label={label}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        placeholder={placeholder}
      />
      <ComboboxContent>
        <ComboboxEmpty>Hech narsa topilmadi.</ComboboxEmpty>
        <ComboboxList>
          {(option: ComboboxOption) => (
            <ComboboxItem key={option.value} value={option}>
              {option.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
