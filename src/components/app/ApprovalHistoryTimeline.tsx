import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { IApprovalRecord } from '@/data/interface/IWorkflow';

interface Props {
  records: IApprovalRecord[];
}

export default function ApprovalHistoryTimeline({ records }: Props) {
  return (
    <div className="space-y-3">
      {records.map((record) => (
        <div key={record.id} className="flex gap-3">
          <div className="mt-0.5 shrink-0">
            {record.status === 'Approved' && <CheckCircle className="w-4 h-4 text-green-600" />}
            {record.status === 'Rejected' && <XCircle className="w-4 h-4 text-red-500" />}
            {record.status === 'Pending'  && <Clock className="w-4 h-4 text-yellow-500" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">
              {record.stepName}: {record.status}
            </p>
            <p className="text-xs text-gray-500">
              {record.actionedByName} • {new Date(record.actionedOn).toLocaleString()}
            </p>
            {record.notes && (
              <p className="text-xs text-red-500 mt-0.5">{record.notes}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
