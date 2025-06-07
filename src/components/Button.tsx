import { ReactNode } from 'react';
import '../styles/components/Button.css';

interface ButtonProps {
    onClick: Function;
    children: ReactNode;
}

const Button: React.FC<ButtonProps> = ({ onClick, children }) => {
    return (
        <button
            className='button'
            onClick={() => onClick()}
        >
            {children}
        </button>
    );
};

export default Button;
