'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { X } from 'lucide-react';
import pageVariants from '../components/PageAnimation';

export default function AssumptionsPage() {
  const [selectedCard, setSelectedCard] = useState(null);

  const cards = {
    assumptions: {
      title: 'Assumptions',
      items: [
        'Federal and state tax brackets and standard deductions adjust annually for inflation.',
        'Users take the federal standard deduction (single or married filing jointly) and satisfy its conditions.',
        'All capital gains are treated as long-term; 85% of Social Security benefits are taxable at the federal level.',
        'States tax capital gains the same way as other income and ignore Social Security taxation.',
        'Average cost-basis method is used for computing capital gains.',
      ],
      border: 'border-gray-800',
    },
    limitations: {
      title: 'Limitations',
      items: [
        'Ignores all taxes except federal income tax, capital gains tax, early-withdrawal tax, and state income tax.',
        'Does not support itemized deductions, state-level taxation of Social Security benefits, or exceptions to early-withdrawal penalties.',
        'State tax data must be provided via YAML (defaults to ignoring state tax if missing; only NY, NJ, CT included for testing).',
        'Loans (for example, mortgages) and real property are not modeled.',
        'Only two tax filing statuses are supported: single and married filing jointly.',
      ],
      border: 'border-gray-600',
    },
    simplifications: {
      title: 'Simplifications',
      items: [
        'Financial goal ignores debts and real assets—represented solely as a minimum investment value.',
        'Historical tax brackets before the first available year reuse that earliest year’s data (no reverse-inflation).',
        'No explicit buy/sell events: income is auto-invested, and assets are sold only when needed for expenses or rebalancing.',
        'Cash-like investments assumed to have zero capital gains; reinvestment and rebalancing processes simplified.',
        'Roth conversions and RMDs use simple in-kind transfers based on IRS tables without modeling regulatory edge cases.',
      ],
      border: 'border-gray-400',
    },
  };

  return (
    <motion.main
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="bg-gray-50 min-h-screen py-12 px-4"
    >
      <div className="max-w-4xl mx-auto relative">
        {/* Blur and disable interactions on header, cards, and back button */}
        <div
          className={`transition-filter duration-300 ${
            selectedCard ? 'filter blur-sm pointer-events-none' : ''
          }`}
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Project Assumptions & Constraints
          </h1>

          {/* Cards layout */}
          <div className="flex flex-col items-center gap-8">
            {Object.entries(cards).map(([key, { title, items, border }]) => (
              <motion.section
                key={key}
                whileHover={{ y: -4 }}
                onClick={() => setSelectedCard(key)}
                className={`w-full md:w-2/3 cursor-pointer bg-white rounded-2xl shadow-md p-6 ${border} border-l-4 transition-shadow`}
              >
                <h2 className="text-2xl font-semibold mb-4 text-black">{title}</h2>
                <ul className="list-disc list-outside ml-6 space-y-2 text-gray-700">
                  {items.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </motion.section>
            ))}
          </div>

          {/* Back to Home button */}
          <div className="mt-12 text-center">
            <Link
              href="/"
              className="inline-block bg-blue-500 text-white px-6 py-2 rounded-full font-medium hover:bg-blue-600 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>

        {/* Focused view popup */}
        <AnimatePresence>
          {selectedCard && (
            <motion.div
              key="popup-overlay"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="pointer-events-auto relative bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 shadow-xl"
              >
                {/* Close icon inside popup card */}
                <button
                  onClick={() => setSelectedCard(null)}
                  className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 hover:cursor-pointer"
                >
                  <X size={24} />
                </button>

                <h2 className="text-3xl font-semibold mb-6 text-gray-900">
                  {cards[selectedCard].title}
                </h2>
                <ul className="list-disc list-outside ml-6 space-y-3 text-gray-700">
                  {cards[selectedCard].items.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.main>
  );
}