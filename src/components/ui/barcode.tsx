// components/ui/barcode.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import BarcodeLib from "react-barcode";

interface BarcodeProps {
  value: string;
  width?: number;
  height?: number;
  format?: string;
  displayValue?: boolean;
  className?: string;
}

// Named export so it can be imported as { Barcode }
export const Barcode: React.FC<BarcodeProps> = ({
  value,
  width = 1,
  height = 40,
  format = "CODE128",
  displayValue = true,
  className = "",
}) => {
  const { t } = useTranslation();

  if (!value) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        {t("no_barcode")}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <BarcodeLib
        value={value}
        width={width}
        height={height}
        format={format}
        displayValue={displayValue}
        margin={0}
        fontSize={12}
        background="transparent"
        lineColor="#000"
      />
    </div>
  );
};
