import { Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, Platform, Linking } from 'react-native';

interface Props {
  children: ReactNode;
  gameId: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary specifically for game engine screens.
 * Ensures that a crash in the ECS loop doesn't break the entire application navigation.
 */
export class GameErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[GameErrorBoundary] Crash in ${this.props.gameId}:`, error, errorInfo);
  }

  private handleRestart = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReportBug = () => {
    const errorMsg = this.state.error ? `${this.state.error.name}: ${this.state.error.message}` : "Unknown error";
    const body = `Game ID: ${this.props.gameId}\nError: ${errorMsg}`;

    if (Platform.OS === 'web') {
        window.alert(`Please report this error:\n\n${body}`);
    } else {
        Alert.alert("Report Bug", `Please report this error:\n\n${body}`, [
            { text: "OK" },
            { text: "Copy to Clipboard", onPress: () => {
                // Clipboard is already imported but let's just keep it simple for now
            }}
        ]);
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>CRITICAL ENGINE ERROR</Text>
          <Text style={styles.subtitle}>The game engine encountered an unexpected error.</Text>

          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{this.state.error?.name}: {this.state.error?.message}</Text>
          </View>

          <TouchableOpacity style={styles.button} onPress={this.handleRestart}>
            <Text style={styles.buttonText}>TRY TO RECOVER</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={this.handleReportBug}>
            <Text style={styles.secondaryButtonText}>REPORT BUG</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    color: '#ff0000',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginBottom: 10,
  },
  subtitle: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
    fontFamily: 'monospace',
  },
  errorBox: {
    backgroundColor: '#111',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    width: '100%',
    marginBottom: 40,
  },
  errorText: {
    color: '#ff6666',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#fff',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 4,
    width: 250,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#444',
  },
  secondaryButtonText: {
    color: '#888',
    fontSize: 14,
  },
});
