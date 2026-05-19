interface Props {
  reason: string | undefined;
}

export default function RejectionReasonBanner({ reason }: Props) {
  if (!reason) return null;

  return (
    <div className="mx-6 mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
      <p className="text-xs font-semibold text-red-600 mb-0.5">Rejection Reason:</p>
      <p className="text-sm text-red-500">{reason}</p>
    </div>
  );
}
