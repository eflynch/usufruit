'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface HealthData {
  status: string;
  timestamp: string;
  version?: string;
  environment?: string;
  database: string;
  uptime?: number;
  error?: string;
}

export default function StatusPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('/api/health');
        const data = await response.json();
        setHealth(data);
      } catch (error) {
        console.error('Failed to fetch health data:', error);
        setHealth({
          status: 'error',
          timestamp: new Date().toISOString(),
          database: 'unknown',
          error: 'Failed to connect to health endpoint'
        });
      } finally {
        setLoading(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds?: number) => {
    if (!seconds) return 'unknown';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return '#22c55e'; // green
      case 'unhealthy':
        return '#ef4444'; // red
      case 'error':
        return '#f59e0b'; // orange
      default:
        return '#6b7280'; // gray
    }
  };

  if (loading) {
    return (
      <div style={{ 
        padding: '40px', 
        fontFamily: 'monospace',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        <h1>System Status</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '40px', 
      fontFamily: 'monospace',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>
        Usufruit System Status
      </h1>

      <div style={{
        padding: '20px',
        border: '2px solid #e5e7eb',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          marginBottom: '15px' 
        }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: getStatusColor(health?.status || 'unknown'),
            marginRight: '10px'
          }} />
          <span style={{ 
            fontSize: '18px', 
            fontWeight: 'bold',
            textTransform: 'capitalize'
          }}>
            {health?.status || 'Unknown'}
          </span>
        </div>

        {health?.error && (
          <div style={{ 
            color: '#ef4444', 
            marginBottom: '15px',
            padding: '10px',
            backgroundColor: '#fef2f2',
            borderRadius: '4px'
          }}>
            <strong>Error:</strong> {health.error}
          </div>
        )}

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ 
                padding: '8px 0', 
                borderBottom: '1px solid #e5e7eb',
                fontWeight: 'bold'
              }}>
                Last Check:
              </td>
              <td style={{ 
                padding: '8px 0', 
                borderBottom: '1px solid #e5e7eb' 
              }}>
                {health?.timestamp ? new Date(health.timestamp).toLocaleString() : 'Unknown'}
              </td>
            </tr>
            <tr>
              <td style={{ 
                padding: '8px 0', 
                borderBottom: '1px solid #e5e7eb',
                fontWeight: 'bold'
              }}>
                Database:
              </td>
              <td style={{ 
                padding: '8px 0', 
                borderBottom: '1px solid #e5e7eb',
                color: health?.database === 'connected' ? '#22c55e' : '#ef4444'
              }}>
                {health?.database || 'Unknown'}
              </td>
            </tr>
            {health?.version && (
              <tr>
                <td style={{ 
                  padding: '8px 0', 
                  borderBottom: '1px solid #e5e7eb',
                  fontWeight: 'bold'
                }}>
                  Version:
                </td>
                <td style={{ 
                  padding: '8px 0', 
                  borderBottom: '1px solid #e5e7eb' 
                }}>
                  {health.version}
                </td>
              </tr>
            )}
            {health?.environment && (
              <tr>
                <td style={{ 
                  padding: '8px 0', 
                  borderBottom: '1px solid #e5e7eb',
                  fontWeight: 'bold'
                }}>
                  Environment:
                </td>
                <td style={{ 
                  padding: '8px 0', 
                  borderBottom: '1px solid #e5e7eb' 
                }}>
                  {health.environment}
                </td>
              </tr>
            )}
            {health?.uptime && (
              <tr>
                <td style={{ 
                  padding: '8px 0',
                  fontWeight: 'bold'
                }}>
                  Uptime:
                </td>
                <td style={{ padding: '8px 0' }}>
                  {formatUptime(health.uptime)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ 
        fontSize: '12px', 
        color: '#6b7280',
        textAlign: 'center'
      }}>
        Status updates every 30 seconds
      </div>

      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <Link 
          href="/" 
          style={{ 
            color: '#3b82f6', 
            textDecoration: 'none',
            fontSize: '14px'
          }}
        >
          ← Back to Library System
        </Link>
      </div>
    </div>
  );
}
