'use client';

import React from 'react';
import { Provider } from 'react-redux';
import { Box, Container, AppBar, Toolbar, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { store } from '@/store';
import { ThemeProvider } from './ThemeProvider';
import OrderBook from '@/components/orderbook/OrderBook';
import OrderSimulation from '@/components/simulation/OrderSimulation';
import MarketDepth from '@/components/charts/MarketDepth';

export default function Home() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <Box>
          <AppBar position="static">
            <Toolbar>
              <Typography variant="h6">
                Real-Time Orderbook Viewer
              </Typography>
            </Toolbar>
          </AppBar>

          <Container maxWidth="xl" className="mt-8">
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <OrderBook />
                  </Grid>
                  <Grid item xs={12}>
                    <MarketDepth />
                  </Grid>
                </Grid>
              </Grid>
              <Grid item xs={12} md={4}>
                <OrderSimulation />
              </Grid>
            </Grid>
          </Container>
        </Box>
      </ThemeProvider>
    </Provider>
  );
}
