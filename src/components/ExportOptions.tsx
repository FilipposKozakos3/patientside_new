import { useState, useRef, useEffect } from 'react';
import { StoredHealthRecord } from '../types/fhir';
import { storageUtils } from '../utils/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Download, QrCode, FileJson, Smartphone, Copy, Check } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import QRCodeStyling from 'qr-code-styling';



interface ExportOptionsProps {
  record: StoredHealthRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ExportOptions({ record, isOpen, onClose }: ExportOptionsProps) {
  const [qrGenerated, setQrGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    if (isOpen && record && qrRef.current && !qrCodeRef.current) {
      generateQRCode();
    }
  }, [isOpen, record]);

  const generateQRCode = () => {
    if (!record || !qrRef.current) return;

    const data = JSON.stringify({
      id: record.id,
      resource: record.resource,
      category: record.category,
      dateAdded: record.dateAdded
    });

    // Clear previous QR code
    if (qrRef.current) {
      qrRef.current.innerHTML = '';
    }

    const qrCode = new QRCodeStyling({
      width: 300,
      height: 300,
      data: data,
      margin: 10,
      qrOptions: {
        typeNumber: 0,
        mode: 'Byte',
        errorCorrectionLevel: 'M'
      },
      imageOptions: {
        hideBackgroundDots: true,
        imageSize: 0.4,
        margin: 0
      },
      dotsOptions: {
        type: 'rounded',
        color: '#000000'
      },
      backgroundOptions: {
        color: '#ffffff'
      },
      cornersSquareOptions: {
        type: 'extra-rounded',
        color: '#000000'
      },
      cornersDotOptions: {
        type: 'dot',
        color: '#000000'
      }
    });

    qrCodeRef.current = qrCode;
    qrCode.append(qrRef.current);
    setQrGenerated(true);
  };

  const downloadQRCode = () => {
    if (qrCodeRef.current && record) {
      qrCodeRef.current.download({
        name: `health-record-${record.id}`,
        extension: 'png'
      });
    }
  };

  const downloadJSON = () => {
    if (!record) return;

    const data = JSON.stringify({
      exportDate: new Date().toISOString(),
      record: record
    }, null, 2);

    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `health-record-${record.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAllRecords = () => {
    const jsonData = storageUtils.exportToJSON();
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-health-records-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    if (!record) return;

    const data = JSON.stringify(record.resource, null, 2);
    navigator.clipboard.writeText(data);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!record) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export Health Record</DialogTitle>
          <DialogDescription>
            Choose how you want to export and share this record
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* QR Code Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <QrCode className="w-5 h-5" />
                QR Code
              </CardTitle>
              <CardDescription>
                Scan this QR code with any FHIR-compatible app to import the record
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <div 
                ref={qrRef} 
                className="border-2 border-gray-200 rounded-lg p-4 bg-white"
              />
              {qrGenerated && (
                <Button onClick={downloadQRCode} variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download QR Code
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Download Options */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileJson className="w-5 h-5" />
                  JSON Export
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button onClick={downloadJSON} variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  This Record
                </Button>
                <Button onClick={downloadAllRecords} variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  All Records
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Smartphone className="w-5 h-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button onClick={copyToClipboard} variant="outline" className="w-full">
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy JSON
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Instructions */}
          <Alert>
            <AlertDescription>
              <strong>For USB/Offline Transfer:</strong> Download the JSON file and save it to a USB drive. 
              You can import this file at any clinic that supports FHIR standards.
            </AlertDescription>
          </Alert>

          <Alert>
            <AlertDescription>
              <strong>Privacy Notice:</strong> QR codes and exported files contain your health information. 
              Only share them with authorized healthcare providers.
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
}
