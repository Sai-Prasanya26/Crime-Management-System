import apiClient from './client';

export interface EmailPdfReportPayload {
  report_type: string;
  scope: string;
  state_id?: number | null;
  district_id?: number | null;
  reporting_period?: string | null;
  report_data?: {
    report_title?: string;
    jurisdiction?: string;
    period_formatted?: string;
    summary_cards?: Array<{ title: string; value: string; subtext: string }>;
    sections?: Array<{
      title: string;
      summary?: string;
      tables?: Array<{
        sub_title?: string;
        headers: Array<{ key: string; label: string; align?: string }>;
        rows: Array<Record<string, any>>;
      }>;
    }>;
    table_headers?: Array<{ key: string; label: string; align?: string }>;
    table_rows?: Array<Record<string, any>>;
  };
}

export interface EmailPdfReportResponse {
  status: string;
  message: string;
  recipient: string;
  report_title: string;
  jurisdiction: string;
  reporting_period: string;
  filename: string;
  bytes_generated: number;
}

export const reportsApi = {
  emailPdfReport: async (payload: EmailPdfReportPayload): Promise<EmailPdfReportResponse> => {
    const response = await apiClient.post<EmailPdfReportResponse>('/reports/email-pdf', payload);
    return response.data;
  },
};

export default reportsApi;
