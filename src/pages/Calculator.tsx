import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTheme } from '@/contexts/ThemeContext'; // Adjust the path as needed

interface CalculatorPopupProps {
  onClose: () => void;
}

const CalculatorPopup: React.FC<CalculatorPopupProps> = ({ onClose }) => {
  const [input, setInput] = useState<string>('0');
  const [previousInput, setPreviousInput] = useState<string>('');
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState<boolean>(false);
  const { theme } = useTheme(); // Get the current theme

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleNumberInput(e.key);
        return;
      }
      if (e.key === '.' || e.key === ',') {
        handleDecimalPoint();
        return;
      }
      if (e.key === '+' || e.key === '-' || e.key === '*' || e.key === '/') {
        let op = e.key;
        if (op === '*') op = '×';
        if (op === '/') op = '÷';
        handleOperator(op);
        return;
      }
      if (e.key === '=' || e.key === 'Enter') {
        handleEquals();
        return;
      }
      if (e.key === 'Escape') {
        handleClear();
        return;
      }
      if (e.key === 'Backspace') {
        handleBackspace();
        return;
      }
      if (e.key === '%') {
        handlePercentage();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [input, previousInput, operation, waitingForOperand]);

  const handleNumberInput = (num: string) => {
    if (waitingForOperand) {
      setInput(num);
      setWaitingForOperand(false);
    } else {
      setInput(input === '0' ? num : input + num);
    }
  };

  const handleDecimalPoint = () => {
    if (waitingForOperand) {
      setInput('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!input.includes('.')) {
      setInput(input + '.');
    }
  };

  const handleOperator = (op: string) => {
    const inputValue = parseFloat(input);
    if (previousInput && operation && !waitingForOperand) {
      const result = performCalculation();
      setPreviousInput(String(result));
      setInput(String(result));
    } else {
      setPreviousInput(input);
    }
    setWaitingForOperand(true);
    setOperation(op);
  };

  const performCalculation = (): number => {
    const prev = parseFloat(previousInput);
    const current = parseFloat(input);
    if (isNaN(prev) || isNaN(current)) return 0;
    switch (operation) {
      case '+': return prev + current;
      case '-': return prev - current;
      case '×': return prev * current;
      case '÷': return prev / current;
      case '%': return prev % current;
      default: return current;
    }
  };

  const handleEquals = () => {
    if (!operation || waitingForOperand) return;
    const result = performCalculation();
    setInput(String(result));
    setPreviousInput('');
    setOperation(null);
    setWaitingForOperand(true);
  };

  const handleClear = () => {
    setInput('0');
    setPreviousInput('');
    setOperation(null);
    setWaitingForOperand(false);
  };

  const handlePlusMinus = () => {
    setInput(String(parseFloat(input) * -1));
  };

  const handlePercentage = () => {
    const value = parseFloat(input);
    setInput(String(value / 100));
  };

  const handleBackspace = () => {
    if (input.length === 1 || (input.length === 2 && input.startsWith('-'))) {
      setInput('0');
    } else {
      setInput(input.slice(0, -1));
    }
  };

  // Theme-based colors
  const getThemeColors = () => {
    if (theme === 'dark') {
      return {
        background: '#1f2937',
        text: '#ffffff',
        buttonBackground: '#374151',
        buttonHover: '#4b5563',
        operatorBackground: '#f59e0b',
        operatorHover: '#fbbf24',
        functionBackground: '#4b5563',
        functionHover: '#6b7280',
        closeBackground: '#dc2626',
        closeHover: '#ef4444'
      };
    } else {
      return {
        background: '#ffffff',
        text: '#000000',
        buttonBackground: '#f9fafb',
        buttonHover: '#e5e7eb',
        operatorBackground: '#f0a500',
        operatorHover: '#f59e0b',
        functionBackground: '#e5e7eb',
        functionHover: '#d1d5db',
        closeBackground: '#dc2626',
        closeHover: '#ef4444'
      };
    }
  };

  const colors = getThemeColors();

  return (
    <PopupOverlay>
      <CalculatorContainer background={colors.background}>
        <DisplayArea background={theme === 'dark' ? '#111827' : '#f8f8f8'}>
          <PreviousOperation color={theme === 'dark' ? '#9ca3af' : '#666'}>
            {previousInput} {operation}
          </PreviousOperation>
          <CurrentInput color={colors.text}>{input}</CurrentInput>
        </DisplayArea>
        <Keypad>
          <ButtonRow>
            <FunctionButton 
              background={colors.functionBackground} 
              hover={colors.functionHover}
              color={colors.text}
              onClick={handleClear}
            >
              C
            </FunctionButton>
            <FunctionButton 
              background={colors.functionBackground} 
              hover={colors.functionHover}
              color={colors.text}
              onClick={handlePlusMinus}
            >
              +/-
            </FunctionButton>
            <FunctionButton 
              background={colors.functionBackground} 
              hover={colors.functionHover}
              color={colors.text}
              onClick={handlePercentage}
            >
              %
            </FunctionButton>
            <OperatorButton 
              background={colors.operatorBackground} 
              hover={colors.operatorHover}
              color="#ffffff"
              onClick={() => handleOperator('÷')}
            >
              ÷
            </OperatorButton>
          </ButtonRow>

          <ButtonRow>
            <NumberButton 
              background={colors.buttonBackground} 
              hover={colors.buttonHover}
              color={colors.text}
              onClick={() => handleNumberInput('7')}
            >
              7
            </NumberButton>
            <NumberButton 
              background={colors.buttonBackground} 
              hover={colors.buttonHover}
              color={colors.text}
              onClick={() => handleNumberInput('8')}
            >
              8
            </NumberButton>
            <NumberButton 
              background={colors.buttonBackground} 
              hover={colors.buttonHover}
              color={colors.text}
              onClick={() => handleNumberInput('9')}
            >
              9
            </NumberButton>
            <OperatorButton 
              background={colors.operatorBackground} 
              hover={colors.operatorHover}
              color="#ffffff"
              onClick={() => handleOperator('×')}
            >
              ×
            </OperatorButton>
          </ButtonRow>

          <ButtonRow>
            <NumberButton 
              background={colors.buttonBackground} 
              hover={colors.buttonHover}
              color={colors.text}
              onClick={() => handleNumberInput('4')}
            >
              4
            </NumberButton>
            <NumberButton 
              background={colors.buttonBackground} 
              hover={colors.buttonHover}
              color={colors.text}
              onClick={() => handleNumberInput('5')}
            >
              5
            </NumberButton>
            <NumberButton 
              background={colors.buttonBackground} 
              hover={colors.buttonHover}
              color={colors.text}
              onClick={() => handleNumberInput('6')}
            >
              6
            </NumberButton>
            <OperatorButton 
              background={colors.operatorBackground} 
              hover={colors.operatorHover}
              color="#ffffff"
              onClick={() => handleOperator('-')}
            >
              -
            </OperatorButton>
          </ButtonRow>

          <ButtonRow>
            <NumberButton 
              background={colors.buttonBackground} 
              hover={colors.buttonHover}
              color={colors.text}
              onClick={() => handleNumberInput('1')}
            >
              1
            </NumberButton>
            <NumberButton 
              background={colors.buttonBackground} 
              hover={colors.buttonHover}
              color={colors.text}
              onClick={() => handleNumberInput('2')}
            >
              2
            </NumberButton>
            <NumberButton 
              background={colors.buttonBackground} 
              hover={colors.buttonHover}
              color={colors.text}
              onClick={() => handleNumberInput('3')}
            >
              3
            </NumberButton>
            <OperatorButton 
              background={colors.operatorBackground} 
              hover={colors.operatorHover}
              color="#ffffff"
              onClick={() => handleOperator('+')}
            >
              +
            </OperatorButton>
          </ButtonRow>

          <ButtonRow>
            <NumberButton 
              wide 
              background={colors.buttonBackground} 
              hover={colors.buttonHover}
              color={colors.text}
              onClick={() => handleNumberInput('0')}
            >
              0
            </NumberButton>
            <NumberButton 
              background={colors.buttonBackground} 
              hover={colors.buttonHover}
              color={colors.text}
              onClick={handleDecimalPoint}
            >
              .
            </NumberButton>
            <EqualsButton 
              background={colors.operatorBackground} 
              hover={colors.operatorHover}
              color="#ffffff"
              onClick={handleEquals}
            >
              =
            </EqualsButton>
          </ButtonRow>
        </Keypad>
        <CloseButton 
          background={colors.closeBackground} 
          hover={colors.closeHover}
          onClick={onClose}
        >
          Close
        </CloseButton>
      </CalculatorContainer>
    </PopupOverlay>
  );
};

interface StyledProps {
  background?: string;
  hover?: string;
  color?: string;
  wide?: boolean;
}

const PopupOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const CalculatorContainer = styled.div<StyledProps>`
  background-color: ${props => props.background || '#fff'};
  border-radius: 8px;
  width: 300px;
  padding: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
`;

const DisplayArea = styled.div<StyledProps>`
  background-color: ${props => props.background || '#f8f8f8'};
  padding: 10px;
  text-align: right;
  border-radius: 4px;
  margin-bottom: 10px;
`;

const PreviousOperation = styled.div<StyledProps>`
  color: ${props => props.color || '#666'};
  font-size: 14px;
  height: 18px;
  margin-bottom: 4px;
`;

const CurrentInput = styled.div<StyledProps>`
  color: ${props => props.color || '#333'};
  font-size: 28px;
  font-weight: bold;
`;

const Keypad = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 8px;
`;

const BaseButton = styled.button<StyledProps>`
  border: none;
  border-radius: 4px;
  font-size: 18px;
  height: 50px;
  cursor: pointer;
  flex: ${props => props.wide ? '2' : '1'};
  transition: background-color 0.2s;
  background-color: ${props => props.background || '#f9f9f9'};
  color: ${props => props.color || '#333'};

  &:hover {
    background-color: ${props => props.hover || '#e0e0e0'};
  }

  &:active {
    transform: scale(0.98);
  }
`;

const NumberButton = styled(BaseButton)``;

const FunctionButton = styled(BaseButton)``;

const OperatorButton = styled(BaseButton)``;

const EqualsButton = styled(BaseButton)``;

const CloseButton = styled.button<StyledProps>`
  width: 100%;
  margin-top: 10px;
  padding: 8px;
  background-color: ${props => props.background || '#dc2626'};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${props => props.hover || '#ef4444'};
  }

  &:active {
    transform: scale(0.98);
  }
`;

export default CalculatorPopup;