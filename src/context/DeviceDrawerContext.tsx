import React, { createContext, useContext, useState } from 'react';

interface DeviceDrawerContextType {
  selectedDevice: string | null;
  openDeviceDrawer: (deviceName: string) => void;
  closeDeviceDrawer: () => void;
}

const DeviceDrawerContext = createContext<DeviceDrawerContextType | undefined>(undefined);

export const DeviceDrawerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  const openDeviceDrawer = (deviceName: string) => {
    // Trim extraneous formatting if label was "device :: interface"
    const cleaned = deviceName.split('::')[0].trim();
    setSelectedDevice(cleaned);
  };

  const closeDeviceDrawer = () => {
    setSelectedDevice(null);
  };

  return (
    <DeviceDrawerContext.Provider value={{ selectedDevice, openDeviceDrawer, closeDeviceDrawer }}>
      {children}
    </DeviceDrawerContext.Provider>
  );
};

export const useDeviceDrawer = () => {
  const ctx = useContext(DeviceDrawerContext);
  if (!ctx) {
    throw new Error('useDeviceDrawer must be used within DeviceDrawerProvider');
  }
  return ctx;
};
