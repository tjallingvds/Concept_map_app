import React from 'react';
import { Button } from './ui/button';

interface TemplateCardProps {
  template: {
    id: string;
    name: string;
    input_text: string;
    description: string;
    imageUrl: string;
  };
  onUseTemplate: (templateId: string) => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onUseTemplate }) => {
  return (
    <div className="bg-background rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      <div className="w-full h-40 bg-gray-100 flex items-center justify-center overflow-hidden">
        <img
          src={template.imageUrl}
          alt={`${template.name} Template Preview`}
          className="w-full h-full object-contain bg-white object-center"
        />
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 flex-grow">{template.name}</h3>

        {template.input_text && <p className="text-sm text-gray-600 mb-4">{template.input_text}</p>}

        <Button onClick={() => onUseTemplate(template.id)} className="mt-auto">
          Use Template
        </Button>
      </div>
    </div>
  );
};

export default TemplateCard;
