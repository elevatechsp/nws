// src/types/project.ts

export type FieldType =
  // Campos Essenciais
  | 'text_short'
  | 'text_long'
  | 'number'
  | 'number_stepper'
  | 'date'
  | 'email'
  | 'masked_id'
  | 'photo'
  | 'signature'
  | 'barcode_qr'
  | 'item_list'
  | 'dropdown_internal'
  | 'dropdown_external'
  | 'radio'
  | 'events_chain'
  // Campos Avançados ("Oh")
  | 'ocr'
  | 'high_volume_list'
  | 'video'
  | 'address_geo'
  | 'canvas_draw'
  | 'custom_code';

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
  readOnly?: boolean;
  autoSaveTrigger?: boolean;
  captureGeoLocation?: boolean;
  options?: string[];
  
  // Customizações do campo 100% Programável
  customHtml?: string;
  customCss?: string;
  customJs?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  version?: string;
  status: 'active' | 'draft' | 'archived';
  fields: FormField[];
  totalSubmissions?: number;
  updatedAt?: string;
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  loginUsername?: string;
  password?: string;
  requirePasswordChange?: boolean;
  role: 'super_admin' | 'admin' | 'supervisor' | 'collector';
  clientCompanyId?: string;
  clientCompanyName?: string;
  allowedProjectIds?: string[]; // Formulários que este usuário tem acesso para responder
  status: 'active' | 'inactive';
  lastActive: string;
}