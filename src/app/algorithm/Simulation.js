// this file should contain a single function which runs the algorithm

export default function runSimulation(initialState, params, taxBrackets) {
    let state = deepCopy(initialState);
    let history = [];
    let error = null;
  
    try {
      initializeMarriedStatus(state, params);
      // Initialize previous year values
      state.previousYearIncome = state.income;
      state.previousYearSS = 0;
      state.previousYearGains = 0;
      state.previousYearEarlyWithdrawals = 0;
  
      for (let year = 0; year < params.years; year++) {
        const currentYear = new Date().getFullYear() + year;
  
        try {
          state.age += 1;
  
          // Step 0: Preliminaries
          // Check for spouse death status changes
          if (state.isMarried && !state.spouseDeceased) {
            // Check for spouse death based on mortality tables or user input
            if (shouldProcessSpouseDeath(state, params, currentYear)) {
              handleSpouseDeath(state);
            }
          }
  
          // Sample inflation rate if using probability distribution
          const currentInflation = generateRandomReturn(
            params.inflation,
            params.inflationVolatility || 0.01
          );
  
          // Update inflation-adjusted values
          updateInflationAdjustedValues(state, currentInflation);
  
          // Apply inflation to expenses - FIX #2
          applyInflation(state, currentInflation);
          
          // Step 1: Run income events
          processEventSeries(state, currentYear);
          processSocialSecurity(state);
  
          state.yearsUntilRetirement > 0;
        
          // Step 2: Process Roth conversions
          if (!state.isDeceased) {
            processRothConversion(state, params);
          }
  
          // Step 3: Process RMDs (after Roth conversion)
          prepareFiscalYear(state);
          if (state.age >= 74 && !state.isDeceased) {
            calculateRMD(state, params);
          }
  
          // Step 4: Update investment values
          updateInvestmentValues(state, params);
  
          // Step 5: Pay non-discretionary expenses and taxes
          handleWithdrawals(state, params);
  
          // Step 6: Pay discretionary expenses
          // (Already handled in handleWithdrawals)
  
          // Step 7: Invest excess cash
          processInvestEvents(state, currentYear);
  
          investExcessCash(state, params);
  
          // Step 8: Rebalance if scheduled
          processRebalanceEvents(state, currentYear);
          // Add after Step 8 in simulation loop
          if (
            params.useTaxEfficientRebalancing &&
            state.age % params.rebalanceFrequency === 0
          ) {
            createTaxEfficientRebalanceEvent(state);
          }
  
          // FIX #1: Update income before it's reset
          state.income = state.curYearIncome;
          // Calculate current year's taxes (to be paid next year)
          calculateTaxes(state, state.inflationAdjustedTaxBrackets);
          

          updateBalances(state);
          validateState(state);
          
                    // CHECKPOINT
                    
          // Step 9: Track year-end balances
          trackYearEndBalances(state);
  
          history.push(deepCopy(state));
        } catch (err) {
          if (err instanceof SimulationError) {
            error = err;
            break;
          }
          throw err;
        }
      }
    } catch (err) {
      console.error("Simulation failed:", err.message);
      throw err;
    }
  
    return { history, error };
  }