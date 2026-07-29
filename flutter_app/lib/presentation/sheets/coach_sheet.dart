import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../data/data.dart';

class CoachSheet extends StatefulWidget {
  const CoachSheet({
    required this.onAsk,
    this.initialPrompt,
    this.activeModel,
    super.key,
  });

  final Future<CoachMessage> Function(
    String query,
    List<Map<String, String>> history,
  )
  onAsk;
  final String? initialPrompt;
  final String? activeModel;

  @override
  State<CoachSheet> createState() => _CoachSheetState();
}

class _ChatItem {
  const _ChatItem({required this.text, required this.isUser});

  final String text;
  final bool isUser;
}

class _CoachSheetState extends State<CoachSheet> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  final List<_ChatItem> _messages = <_ChatItem>[];
  bool _sending = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final prompt = widget.initialPrompt?.trim();
    if (prompt != null && prompt.isNotEmpty) {
      _input.text = prompt;
    }
  }

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  List<Map<String, String>> get _history => _messages
      .map((message) {
        return <String, String>{
          'role': message.isUser ? 'user' : 'assistant',
          'text': message.text,
        };
      })
      .toList(growable: false);

  Future<void> _send([String? suggested]) async {
    final query = (suggested ?? _input.text).trim();
    if (query.isEmpty || _sending) return;
    final priorHistory = _history;
    setState(() {
      _messages.add(_ChatItem(text: query, isUser: true));
      _input.clear();
      _sending = true;
      _error = null;
    });
    _scrollToBottom();
    try {
      final response = await widget.onAsk(query, priorHistory);
      if (!mounted) return;
      setState(() {
        _messages.add(_ChatItem(text: response.message, isUser: false));
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'Coach belum dapat menjawab. Coba lagi sebentar.';
        });
      }
    } finally {
      if (mounted) {
        setState(() => _sending = false);
        _scrollToBottom();
      }
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      _scroll.animateTo(
        _scroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final keyboard = MediaQuery.viewInsetsOf(context).bottom;
    return AnimatedPadding(
      duration: const Duration(milliseconds: 180),
      padding: EdgeInsets.only(bottom: keyboard),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: MediaQuery.sizeOf(context).height * 0.82,
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 10, 10),
                child: Row(
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: const LinearGradient(
                          colors: [AppColors.protein, AppColors.hydration],
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.protein.withValues(alpha: 0.3),
                            blurRadius: 18,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Coach',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          Text(
                            widget.activeModel == null
                                ? 'Panduan lokal siap'
                                : 'AI aktif · ${widget.activeModel}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(
                              context,
                            ).textTheme.bodyMedium?.copyWith(fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    TextButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: const Text('Tutup'),
                    ),
                  ],
                ),
              ),
              const Divider(),
              Expanded(
                child: _messages.isEmpty
                    ? _CoachEmpty(onSuggestion: _send)
                    : ListView.builder(
                        controller: _scroll,
                        keyboardDismissBehavior:
                            ScrollViewKeyboardDismissBehavior.onDrag,
                        padding: const EdgeInsets.fromLTRB(16, 18, 16, 14),
                        itemCount: _messages.length + (_sending ? 1 : 0),
                        itemBuilder: (context, index) {
                          if (index == _messages.length) {
                            return const Align(
                              alignment: Alignment.centerLeft,
                              child: _TypingBubble(),
                            );
                          }
                          final message = _messages[index];
                          return Align(
                            alignment: message.isUser
                                ? Alignment.centerRight
                                : Alignment.centerLeft,
                            child: _MessageBubble(message: message),
                          );
                        },
                      ),
              ),
              if (_error case final error?)
                Padding(
                  padding: const EdgeInsets.fromLTRB(18, 0, 18, 8),
                  child: Text(
                    error,
                    style: Theme.of(
                      context,
                    ).textTheme.bodyMedium?.copyWith(color: AppColors.danger),
                  ),
                ),
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 8, 14, 12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _input,
                        minLines: 1,
                        maxLines: 4,
                        textCapitalization: TextCapitalization.sentences,
                        textInputAction: TextInputAction.send,
                        onSubmitted: (_) => _send(),
                        decoration: const InputDecoration(
                          hintText: 'Tanyakan tentang harimu…',
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton.filled(
                      tooltip: 'Kirim',
                      onPressed: _sending ? null : _send,
                      icon: const Icon(Icons.arrow_upward_rounded),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CoachEmpty extends StatelessWidget {
  const _CoachEmpty({required this.onSuggestion});

  final ValueChanged<String> onSuggestion;

  @override
  Widget build(BuildContext context) {
    const suggestions = <String>[
      'Apa langkah kecil terbaik hari ini?',
      'Apakah saya perlu makan sekarang?',
      'Bantu pilih makanan tinggi protein.',
    ];
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Tanya dengan konteks harimu',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 8),
            Text(
              'Coach membaca asupan, energi keluar, langkah, air, dan hasil check-in terbaru.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 22),
            for (final suggestion in suggestions)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: () => onSuggestion(suggestion),
                    child: Text(suggestion),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message});

  final _ChatItem message;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(maxWidth: 330),
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 12),
      decoration: BoxDecoration(
        color: message.isUser ? AppColors.diet : AppColors.surfaceElevated,
        borderRadius: BorderRadius.only(
          topLeft: const Radius.circular(19),
          topRight: const Radius.circular(19),
          bottomLeft: Radius.circular(message.isUser ? 19 : 5),
          bottomRight: Radius.circular(message.isUser ? 5 : 19),
        ),
        border: message.isUser ? null : Border.all(color: AppColors.outline),
      ),
      child: Text(
        message.text,
        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
          color: AppColors.textPrimary,
          fontSize: 15,
        ),
      ),
    );
  }
}

class _TypingBubble extends StatelessWidget {
  const _TypingBubble();

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.surfaceElevated,
        borderRadius: BorderRadius.circular(19),
      ),
      child: const Text(
        '•••',
        style: TextStyle(color: AppColors.textSecondary, letterSpacing: 3),
      ),
    );
  }
}
