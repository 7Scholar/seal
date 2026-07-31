interface Props {
  message: string;
  onDismiss: () => void;
}

export function Problem({ message, onDismiss }: Props) {
  return (
    <div role="alert" className="problem">
      <span className="problem__message">{message}</span>
      <button type="button" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}
