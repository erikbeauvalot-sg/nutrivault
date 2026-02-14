import { motion } from 'framer-motion';
import { useNavigationDirection } from '../../hooks/useNavigationDirection';
import { isNative } from '../../utils/platform';

const spring = { type: 'spring', stiffness: 300, damping: 30 };

const variants = {
  enter: (direction) => ({
    x: direction === 'POP' ? '-30%' : '100%',
    opacity: direction === 'POP' ? 0.8 : 1,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction === 'POP' ? '100%' : '-30%',
    opacity: direction === 'POP' ? 1 : 0.8,
  }),
};

const AnimatedPage = ({ children }) => {
  const directionRef = useNavigationDirection();

  if (!isNative) {
    return children;
  }

  return (
    <motion.div
      className="animated-page"
      custom={directionRef.current}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={spring}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        minHeight: '100%',
        willChange: 'transform, opacity',
        backfaceVisibility: 'hidden',
      }}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedPage;
