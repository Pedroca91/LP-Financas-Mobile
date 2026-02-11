import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { chatService } from '../services/api';

export default function ChatScreen() {
  const { colors } = useTheme();
  const scrollViewRef = useRef();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    // Mensagem de boas-vindas
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Olá! 👋 Sou o assistente financeiro do LP Finanças. Posso ajudar você com:\n\n• Dicas de economia\n• Análise dos seus gastos\n• Planejamento financeiro\n• Dúvidas sobre investimentos\n\nComo posso ajudar você hoje?',
      },
    ]);
  }, []);

  const sendMessage = async () => {
    if (!inputText.trim() || loading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      const response = await chatService.sendMessage(userMessage.content, sessionId);
      
      if (!sessionId && response.data.session_id) {
        setSessionId(response.data.session_id);
      }

      const assistantMessage = {
        id: Date.now().toString() + '_response',
        role: 'assistant',
        content: response.data.response,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now().toString() + '_error',
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.',
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Conversa reiniciada! Como posso ajudar você?',
      },
    ]);
    setSessionId(null);
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.textLight,
    },
    headerSubtitle: {
      fontSize: 13,
      color: colors.textLight,
      opacity: 0.8,
    },
    clearButton: {
      padding: 8,
    },
    messagesContainer: {
      flex: 1,
      padding: 16,
    },
    messageWrapper: {
      marginBottom: 16,
      maxWidth: '85%',
    },
    userWrapper: {
      alignSelf: 'flex-end',
    },
    assistantWrapper: {
      alignSelf: 'flex-start',
    },
    messageBubble: {
      padding: 14,
      borderRadius: 18,
    },
    userBubble: {
      backgroundColor: colors.gold,
      borderBottomRightRadius: 4,
    },
    assistantBubble: {
      backgroundColor: colors.surface,
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    errorBubble: {
      backgroundColor: colors.expense + '20',
      borderColor: colors.expense,
    },
    messageText: {
      fontSize: 15,
      lineHeight: 22,
    },
    userText: {
      color: '#fff',
    },
    assistantText: {
      color: colors.text,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      padding: 12,
      paddingBottom: Platform.OS === 'ios' ? 30 : 12,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 10,
    },
    input: {
      flex: 1,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      paddingHorizontal: 18,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
      maxHeight: 120,
    },
    sendButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.gold,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendButtonDisabled: {
      backgroundColor: colors.border,
    },
    typingIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderBottomLeftRadius: 4,
      alignSelf: 'flex-start',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    typingDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.textSecondary,
      marginHorizontal: 2,
    },
    suggestionContainer: {
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    suggestionTitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    suggestionScroll: {
      flexDirection: 'row',
      gap: 8,
    },
    suggestionChip: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    suggestionText: {
      fontSize: 13,
      color: colors.text,
    },
  });

  const suggestions = [
    'Como economizar mais?',
    'Analisar meus gastos',
    'Dicas de investimento',
    'Como fazer reserva de emergência?',
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Assistente IA</Text>
          <Text style={styles.headerSubtitle}>Seu consultor financeiro pessoal</Text>
        </View>
        <TouchableOpacity style={styles.clearButton} onPress={clearChat}>
          <Ionicons name="refresh" size={24} color={colors.textLight} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToBottom}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageWrapper,
              message.role === 'user' ? styles.userWrapper : styles.assistantWrapper,
            ]}
          >
            <View
              style={[
                styles.messageBubble,
                message.role === 'user' ? styles.userBubble : styles.assistantBubble,
                message.isError && styles.errorBubble,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  message.role === 'user' ? styles.userText : styles.assistantText,
                ]}
              >
                {message.content}
              </Text>
            </View>
          </View>
        ))}

        {loading && (
          <View style={styles.typingIndicator}>
            <ActivityIndicator size="small" color={colors.gold} />
            <Text style={{ marginLeft: 8, color: colors.textSecondary }}>
              Pensando...
            </Text>
          </View>
        )}
        
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <View style={styles.suggestionContainer}>
          <Text style={styles.suggestionTitle}>Sugestões:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.suggestionScroll}>
              {suggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionChip}
                  onPress={() => setInputText(suggestion)}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Digite sua pergunta..."
          placeholderTextColor={colors.textSecondary}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() || loading) && styles.sendButtonDisabled,
          ]}
          onPress={sendMessage}
          disabled={!inputText.trim() || loading}
        >
          <Ionicons
            name="send"
            size={22}
            color={inputText.trim() && !loading ? '#fff' : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
