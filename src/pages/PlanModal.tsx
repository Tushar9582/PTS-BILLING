import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const plans = [
  {
    title: 'Starter',
    price: 'Free',
    features: [
      '1 User Account',
      '50 Invoices/Month',
      'Basic Tax Settings',
      'Standard Templates',
      'Email Support',
    ],
    bgColor: 'bg-white',
    borderColor: 'border-blue-400',
    popular: false,
    highlightColor: 'from-blue-100 to-white',
  },
  {
    title: 'Professional',
    price: '₹1200/mo',
    features: [
      '5 User Accounts',
      '500 Invoices/Month',
      'GST & Discount Management',
      'Customizable Templates',
      'Priority Email Support',
    ],
    bgColor: 'bg-gradient-to-b from-blue-50 to-white',
    borderColor: 'border-blue-500',
    popular: true,
    highlightColor: 'from-blue-200 to-blue-50',
  },
  {
    title: 'Business',
    price: '₹2500/mo',
    features: [
      '15 User Accounts',
      'Unlimited Invoices',
      'Multi-Business Support',
      'Branded Invoices & Reports',
      '24/7 Live Support',
    ],
    bgColor: 'bg-gradient-to-b from-blue-100 to-white',
    borderColor: 'border-blue-600',
    popular: true,
    highlightColor: 'from-blue-300 to-blue-100',
  },
  {
    title: 'Enterprise',
    price: 'Custom',
    features: [
      'Unlimited Users',
      'Dedicated Account Manager',
      'API Integration',
      'Custom Features & Automation',
    ],
    bgColor: 'bg-gradient-to-b from-blue-200 to-white',
    borderColor: 'border-blue-700',
    popular: false,
    highlightColor: 'from-blue-400 to-blue-200',
  },
];

const PlanModal = ({ isOpen, onClose }) => {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isHovering, setIsHovering] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'auto';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div  
          className="absolute inset-0 bg-gradient-to-br from-blue-900/60 to-purple-900/60 backdrop-blur-sm"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        ></motion.div>

        <motion.div 
          className="relative w-full max-w-6xl mx-4 my-8 bg-white rounded-2xl shadow-2xl p-4 md:p-8 z-50 overflow-y-auto"
          style={{ maxHeight: '90vh' }}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-600"></div>
          <div className="absolute top-4 right-4 w-24 h-24 bg-blue-200 rounded-full opacity-10"></div>
          <div className="absolute bottom-8 left-8 w-16 h-16 bg-purple-200 rounded-full opacity-10"></div>
          
          <div className="relative z-10">
            <h2 className="text-2xl md:text-4xl font-bold text-center mb-2 text-gray-800">
              Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Billing Plan</span>
            </h2>
            <p className="text-center text-sm md:text-base text-gray-600 mb-6 md:mb-8 max-w-2xl mx-auto">
              Simplify your invoicing and grow your business with our flexible billing software packages.
            </p>
            
            <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-2 lg:grid-cols-4 gap-6'}`}>
              {plans.map((plan, idx) => (
                <motion.div
                  key={idx}
                  className={`relative rounded-xl border-2 ${plan.borderColor} p-4 md:p-6 ${plan.bgColor} overflow-hidden transition-all duration-300 ${isHovering === idx && !isMobile ? 'shadow-lg' : 'shadow-md'}`}
                  whileHover={!isMobile ? { y: -5 } : {}}
                  onHoverStart={() => !isMobile && setIsHovering(idx)}
                  onHoverEnd={() => !isMobile && setIsHovering(null)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  {plan.popular && (
                    <motion.div 
                      className="absolute top-0 right-0 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white text-xs font-bold px-2 py-1 md:px-3 rounded-bl-lg rounded-tr-lg"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      MOST POPULAR
                    </motion.div>
                  )}
                  
                  <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">{plan.title}</h3>
                  <p className="text-2xl md:text-3xl font-extrabold text-blue-700 mb-3 md:mb-4">
                    {plan.price}
                    {plan.price !== 'Custom' && <span className="text-sm font-normal text-gray-500">/month</span>}
                  </p>
                  
                  <ul className="mb-4 md:mb-6 space-y-2 md:space-y-3">
                    {plan.features.map((feature, fIdx) => (
                      <motion.li 
                        key={fIdx} 
                        className="text-sm md:text-base text-gray-700 flex items-start"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + (fIdx * 0.1) }}
                      >
                        <svg className="w-4 h-4 md:w-5 md:h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        {feature}
                      </motion.li>
                    ))}
                  </ul>
                  
                  <motion.button 
                    className={`w-full py-2 md:py-3 text-sm md:text-base rounded-lg font-semibold transition-all duration-300 ${
                      plan.popular 
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg hover:shadow-blue-200' 
                        : 'bg-white text-blue-600 border-2 border-blue-500 hover:bg-blue-50'
                    }`}
                    whileTap={{ scale: 0.95 }}
                  >
                    {plan.price === 'Custom' ? 'Contact Sales' : 'Get Started'}
                  </motion.button>
                  
                  {isHovering === idx && !isMobile && (
                    <motion.div 
                      className={`absolute inset-0 bg-gradient-to-b ${plan.highlightColor} opacity-30 pointer-events-none`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.3 }}
                      exit={{ opacity: 0 }}
                    />
                  )}
                </motion.div>
              ))}
            </div>
            
            <div className="mt-6 md:mt-8 text-center">
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4 md:w-5 md:h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                </svg>
                <span className="text-sm md:text-base text-gray-700">30-day money-back guarantee</span>
              </div>
            </div>
          </div>

          <motion.button 
            onClick={onClose}
            className="absolute top-2 right-2 md:top-6 md:right-6 text-gray-500 hover:text-red-500 text-2xl md:text-3xl p-1 rounded-full hover:bg-gray-100 transition-colors"
            whileHover={{ rotate: 90 }}
            whileTap={{ scale: 0.9 }}
          >
            &times;
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PlanModal;