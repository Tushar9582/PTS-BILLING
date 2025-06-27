import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

interface CalculatorPopupProps {
  onClose: () => void;
}

const CalculatorPopup: React.FC<CalculatorPopupProps> = ({ onClose }) => {
  const [input, setInput] = useState<string>('0');
  const [previousInput, setPreviousInput] = useState<string>('');
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState<boolean>(false);

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

  return (
    <PopupOverlay>
      <CalculatorContainer>
        <DisplayArea>
          <PreviousOperation>
            {previousInput} {operation}
          </PreviousOperation>
          <CurrentInput>{input}</CurrentInput>
        </DisplayArea>
        <Keypad>
          <ButtonRow>
            <FunctionButton onClick={handleClear}>C</FunctionButton>
            <FunctionButton onClick={handlePlusMinus}>+/-</FunctionButton>
            <FunctionButton onClick={handlePercentage}>%</FunctionButton>
            <OperatorButton onClick={() => handleOperator('÷')}>÷</OperatorButton>
          </ButtonRow>

          <ButtonRow>
            <NumberButton onClick={() => handleNumberInput('7')}>7</NumberButton>
            <NumberButton onClick={() => handleNumberInput('8')}>8</NumberButton>
            <NumberButton onClick={() => handleNumberInput('9')}>9</NumberButton>
            <OperatorButton onClick={() => handleOperator('×')}>×</OperatorButton>
          </ButtonRow>

          <ButtonRow>
            <NumberButton onClick={() => handleNumberInput('4')}>4</NumberButton>
            <NumberButton onClick={() => handleNumberInput('5')}>5</NumberButton>
            <NumberButton onClick={() => handleNumberInput('6')}>6</NumberButton>
            <OperatorButton onClick={() => handleOperator('-')}>-</OperatorButton>
          </ButtonRow>

          <ButtonRow>
            <NumberButton onClick={() => handleNumberInput('1')}>1</NumberButton>
            <NumberButton onClick={() => handleNumberInput('2')}>2</NumberButton>
            <NumberButton onClick={() => handleNumberInput('3')}>3</NumberButton>
            <OperatorButton onClick={() => handleOperator('+')}>+</OperatorButton>
          </ButtonRow>

          <ButtonRow>
            <NumberButton wide onClick={() => handleNumberInput('0')}>0</NumberButton>
            <NumberButton onClick={handleDecimalPoint}>.</NumberButton>
            <EqualsButton onClick={handleEquals}>=</EqualsButton>
          </ButtonRow>
        </Keypad>
        <CloseButton onClick={onClose}>Close</CloseButton>
      </CalculatorContainer>
    </PopupOverlay>
  );
};

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

const CalculatorContainer = styled.div`
  background-color: #fff;
  border-radius: 8px;
  width: 300px;
  padding: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
`;

const DisplayArea = styled.div`
  background-color: #f8f8f8;
  padding: 10px;
  text-align: right;
  border-radius: 4px;
  margin-bottom: 10px;
`;

const PreviousOperation = styled.div`
  color: #666;
  font-size: 14px;
  height: 18px;
  margin-bottom: 4px;
`;

const CurrentInput = styled.div`
  color: #333;
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

interface ButtonProps {
  wide?: boolean;
}

const BaseButton = styled.button<ButtonProps>`
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 18px;
  height: 50px;
  cursor: pointer;
  flex: ${props => props.wide ? '2' : '1'};
  transition: background-color 0.2s;

  &:active {
    background-color: #e0e0e0;
  }
`;

const NumberButton = styled(BaseButton)`
  background-color: #f9f9f9;
  color: #333;
`;

const FunctionButton = styled(BaseButton)`
  background-color: #e9e9e9;
  color: #333;
`;

const OperatorButton = styled(BaseButton)`
  background-color: #f0a500;
  color: white;
`;

const EqualsButton = styled(BaseButton)`
  background-color: #f0a500;
  color: white;
`;

const CloseButton = styled.button`
  width: 100%;
  margin-top: 10px;
  padding: 8px;
  background-color:rgb(235, 28, 28);
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;

  
`;

export default CalculatorPopup;