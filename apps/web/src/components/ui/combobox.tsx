import {
  createContext,
  forwardRef,
  useContext,
  useRef,
  type ComponentPropsWithRef,
  type RefObject,
} from 'react';
import { Combobox as Primitive } from '@base-ui/react/combobox';
import { Check, ChevronDown, X } from 'lucide-react';
import { ComboboxPortalContext } from './combobox-context';
import './combobox.css';

const AnchorContext = createContext<RefObject<HTMLDivElement | null> | undefined>(undefined);
export function Combobox<Value, Multiple extends boolean | undefined = false, Item = Value>(
  props: Primitive.Root.Props<Value, Multiple, Item>,
) {
  const anchor = useRef<HTMLDivElement>(null);
  return (
    <AnchorContext.Provider value={anchor}>
      <Primitive.Root {...props} />
    </AnchorContext.Provider>
  );
}
type InputProps = Omit<Primitive.Input.Props, 'className'> & {
  className?: string;
  showClear?: boolean;
};
export const ComboboxInput = forwardRef<HTMLInputElement, InputProps>(function ComboboxInput(
  { className = '', showClear = false, ...props },
  ref,
) {
  const anchor = useContext(AnchorContext);
  return (
    <div
      ref={anchor}
      className={`combobox-control ${className}`}
      data-invalid={props['aria-invalid'] || undefined}
    >
      <Primitive.Input {...props} ref={ref} className="combobox-input" />
      {showClear && (
        <Primitive.Clear className="combobox-button" aria-label="Tanlovni tozalash">
          <X size={16} />
        </Primitive.Clear>
      )}
      <Primitive.Trigger className="combobox-button" aria-label="Variantlarni ochish" tabIndex={-1}>
        <ChevronDown size={16} className="combobox-chevron" aria-hidden="true" />
      </Primitive.Trigger>
    </div>
  );
});
type ContentProps = Omit<ComponentPropsWithRef<typeof Primitive.Popup>, 'className'> & {
  className?: string;
};
export function ComboboxContent({ className = '', children, ...props }: ContentProps) {
  const container = useContext(ComboboxPortalContext);
  const anchor = useContext(AnchorContext);
  return (
    <Primitive.Portal container={container}>
      <Primitive.Positioner
        anchor={anchor}
        sideOffset={5}
        collisionPadding={12}
        className="combobox-positioner"
      >
        <Primitive.Popup
          {...props}
          className={`combobox-content ${className}`}
          data-slot="combobox-content"
        >
          {children}
        </Primitive.Popup>
      </Primitive.Positioner>
    </Primitive.Portal>
  );
}
export function ComboboxEmpty(props: Primitive.Empty.Props) {
  return <Primitive.Empty {...props} className="combobox-empty" />;
}
export const ComboboxList = Primitive.List;
export function ComboboxItem({
  children,
  className = '',
  ...props
}: Omit<Primitive.Item.Props, 'className'> & { className?: string }) {
  return (
    <Primitive.Item {...props} className={`combobox-item ${className}`}>
      <span>{children}</span>
      <Primitive.ItemIndicator className="combobox-item-indicator">
        <Check size={16} />
      </Primitive.ItemIndicator>
    </Primitive.Item>
  );
}
