import { useEffect } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';

const RouteGuard = ({ children }) => {
  const { user, loading } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();

  useEffect(() => {
    if (!loading) {
      const isWelcomeScreen = route.name === 'Welcome';

      
      if (!user && !isWelcomeScreen) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Welcome' }],
        });
      }

      if (user && isWelcomeScreen) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Dashboard' }],
        });
      }
    }
  }, [user, loading, route.name]);

  if (loading) return null;

  return children;
};

export default RouteGuard;
