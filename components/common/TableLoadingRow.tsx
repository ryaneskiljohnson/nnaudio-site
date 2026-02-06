import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
`;

interface TableLoadingRowProps {
  colSpan: number;
  message: string;
}

const TableLoadingRow: React.FC<TableLoadingRowProps> = ({ colSpan, message }) => {
  return (
    <tr>
      <td colSpan={colSpan} style={{ padding: 0, border: 'none' }}>
        <EmptyState>
          <span style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '0.75rem', 
            color: 'var(--text-secondary)' 
          }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" as const }}
              style={{ 
                width: '20px', 
                height: '20px', 
                border: '3px solid rgba(108, 99, 255, 0.3)', 
                borderTop: '3px solid var(--primary)', 
                borderRadius: '50%' 
              }}
            />
            {message}
          </span>
        </EmptyState>
      </td>
    </tr>
  );
};

export default TableLoadingRow; 