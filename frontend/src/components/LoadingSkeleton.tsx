import React from 'react';

// Base skeleton shimmer animation component
const Shimmer: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`relative overflow-hidden ${className}`}>
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-cyber-gray/20 to-transparent" />
  </div>
);

// Reusable skeleton shapes
export const SkeletonBox: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-cyber-gray/30 rounded ${className}`}>
    <Shimmer className="h-full w-full rounded" />
  </div>
);

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ lines = 1, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className={`h-4 bg-cyber-gray/30 rounded ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}>
        <Shimmer className="h-full w-full rounded" />
      </div>
    ))}
  </div>
);

export const SkeletonCircle: React.FC<{ size?: string }> = ({ size = 'w-10 h-10' }) => (
  <div className={`${size} bg-cyber-gray/30 rounded-full`}>
    <Shimmer className="h-full w-full rounded-full" />
  </div>
);

// Dashboard skeleton
export const DashboardSkeleton: React.FC = () => (
  <div className="p-4 space-y-4 animate-in fade-in duration-300">
    {/* Stats header */}
    <div className="grid grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-cyber-dark border border-cyber-gray rounded p-4">
          <SkeletonBox className="h-6 w-24 mb-2" />
          <SkeletonBox className="h-10 w-20" />
        </div>
      ))}
    </div>
    {/* Main content grid */}
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-cyber-dark border border-cyber-gray rounded p-4 h-64">
        <SkeletonBox className="h-6 w-32 mb-4" />
        <SkeletonBox className="h-40 w-full" />
      </div>
      <div className="bg-cyber-dark border border-cyber-gray rounded p-4 h-64">
        <SkeletonBox className="h-6 w-32 mb-4" />
        <SkeletonBox className="h-40 w-full rounded-full mx-auto" />
      </div>
    </div>
    {/* Bottom panels */}
    <div className="grid grid-cols-3 gap-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-cyber-dark border border-cyber-gray rounded p-4 h-32">
          <SkeletonBox className="h-5 w-40 mb-3" />
          <SkeletonText lines={3} />
        </div>
      ))}
    </div>
  </div>
);

// Assets table skeleton
export const AssetsTableSkeleton: React.FC<{ rows?: number }> = ({ rows = 10 }) => (
  <div className="animate-in fade-in duration-300">
    {/* Header */}
    <div className="bg-cyber-dark border-b border-cyber-gray p-4 flex gap-4">
      <SkeletonBox className="h-8 w-32" />
      <SkeletonBox className="h-8 w-48" />
      <SkeletonBox className="h-8 w-24" />
    </div>
    {/* Table rows */}
    <div className="divide-y divide-cyber-gray/30">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 flex items-center gap-4" style={{ animationDelay: `${i * 50}ms` }}>
          <SkeletonCircle size="w-8 h-8" />
          <SkeletonBox className="h-5 w-32" />
          <SkeletonBox className="h-5 w-28" />
          <SkeletonBox className="h-5 w-24" />
          <SkeletonBox className="h-5 w-20" />
          <SkeletonBox className="h-5 w-16" />
          <SkeletonBox className="h-5 w-24" />
        </div>
      ))}
    </div>
  </div>
);

// Topology/Graph skeleton
export const TopologySkeleton: React.FC = () => (
  <div className="animate-in fade-in duration-300 h-full relative">
    {/* Toolbar */}
    <div className="absolute top-4 left-4 right-4 z-10 flex gap-2">
      <SkeletonBox className="h-8 w-32" />
      <SkeletonBox className="h-8 w-24" />
      <SkeletonBox className="h-8 w-28" />
    </div>
    {/* Graph placeholder */}
    <div className="h-full flex items-center justify-center">
      <div className="relative">
        {/* Central node */}
        <SkeletonCircle size="w-16 h-16" />
        {/* Surrounding nodes with connections */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              transform: `rotate(${angle}deg) translateX(80px) rotate(-${angle}deg)`,
              transformOrigin: 'center',
              left: '50%',
              top: '50%',
              marginLeft: '-20px',
              marginTop: '-20px'
            }}
          >
            <SkeletonCircle size="w-10 h-10" />
          </div>
        ))}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-cyber-blue animate-pulse text-sm font-mono">
            ◎ Building topology...
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Scans page skeleton
export const ScansSkeleton: React.FC = () => (
  <div className="animate-in fade-in duration-300 flex h-full">
    {/* Sidebar */}
    <div className="w-64 bg-cyber-dark border-r border-cyber-gray p-4 space-y-3">
      <SkeletonBox className="h-8 w-full" />
      <SkeletonBox className="h-8 w-full" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <SkeletonCircle size="w-6 h-6" />
          <SkeletonBox className="h-5 w-24" />
        </div>
      ))}
    </div>
    {/* Main content */}
    <div className="flex-1 p-4">
      <div className="bg-cyber-dark border border-cyber-gray rounded p-4 h-full">
        <SkeletonBox className="h-8 w-48 mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <SkeletonBox className="h-6 w-20" />
              <SkeletonBox className="h-6 w-48" />
              <SkeletonBox className="h-6 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Access page skeleton
export const AccessSkeleton: React.FC = () => (
  <div className="animate-in fade-in duration-300 flex h-full">
    {/* Asset sidebar */}
    <div className="w-64 bg-cyber-dark border-r border-cyber-gray p-4 space-y-3">
      <SkeletonBox className="h-8 w-full" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 p-2 bg-cyber-darker rounded">
          <SkeletonCircle size="w-6 h-6" />
          <div className="flex-1">
            <SkeletonBox className="h-4 w-24 mb-1" />
            <SkeletonBox className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
    {/* Main terminal area */}
    <div className="flex-1 p-4">
      <div className="bg-cyber-dark border border-cyber-gray rounded p-4 h-full flex items-center justify-center">
        <div className="text-center">
          <SkeletonBox className="h-12 w-12 mx-auto mb-4 rounded" />
          <SkeletonBox className="h-5 w-40 mx-auto mb-2" />
          <SkeletonBox className="h-4 w-32 mx-auto" />
        </div>
      </div>
    </div>
  </div>
);

// Settings skeleton
export const SettingsSkeleton: React.FC = () => (
  <div className="animate-in fade-in duration-300 p-4 space-y-4">
    {/* Tabs */}
    <div className="flex gap-2 border-b border-cyber-gray pb-2">
      {[1, 2, 3, 4].map(i => (
        <SkeletonBox key={i} className="h-8 w-24" />
      ))}
    </div>
    {/* Settings form */}
    <div className="bg-cyber-dark border border-cyber-gray rounded p-6 space-y-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <SkeletonBox className="h-4 w-32" />
          <SkeletonBox className="h-10 w-full" />
        </div>
      ))}
      <SkeletonBox className="h-10 w-32" />
    </div>
  </div>
);

// Traffic page skeleton
export const TrafficSkeleton: React.FC = () => (
  <div className="animate-in fade-in duration-300 p-4 space-y-4">
    {/* Controls */}
    <div className="flex gap-4">
      <SkeletonBox className="h-10 w-32" />
      <SkeletonBox className="h-10 w-40" />
      <SkeletonBox className="h-10 w-24" />
    </div>
    {/* Traffic table */}
    <div className="bg-cyber-dark border border-cyber-gray rounded">
      <div className="p-4 border-b border-cyber-gray flex gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <SkeletonBox key={i} className="h-5 w-20" />
        ))}
      </div>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="p-4 border-b border-cyber-gray/30 flex gap-4">
          <SkeletonBox className="h-4 w-28" />
          <SkeletonBox className="h-4 w-28" />
          <SkeletonBox className="h-4 w-16" />
          <SkeletonBox className="h-4 w-16" />
          <SkeletonBox className="h-4 w-20" />
          <SkeletonBox className="h-4 w-24" />
        </div>
      ))}
    </div>
  </div>
);

// Host page skeleton
export const HostSkeleton: React.FC = () => (
  <div className="animate-in fade-in duration-300 p-4">
    <div className="bg-cyber-dark border border-cyber-gray rounded p-6">
      <SkeletonBox className="h-8 w-48 mb-6" />
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <SkeletonBox className="h-6 w-32" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <SkeletonBox className="h-5 w-24" />
              <SkeletonBox className="h-5 w-48" />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <SkeletonBox className="h-6 w-32" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <SkeletonBox className="h-5 w-24" />
              <SkeletonBox className="h-5 w-48" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Generic page loading fallback
export const PageLoadingFallback: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="flex items-center justify-center h-64 animate-in fade-in duration-300">
    <div className="text-center">
      <div className="w-12 h-12 border-2 border-cyber-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <div className="text-cyber-blue font-mono text-sm">{message}</div>
    </div>
  </div>
);

export default {
  DashboardSkeleton,
  AssetsTableSkeleton,
  TopologySkeleton,
  ScansSkeleton,
  AccessSkeleton,
  SettingsSkeleton,
  TrafficSkeleton,
  HostSkeleton,
  PageLoadingFallback,
  SkeletonBox,
  SkeletonText,
  SkeletonCircle
};
