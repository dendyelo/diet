import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../../platform/glass_motion_service.dart';

/// Shares one device-motion stream across every reflective surface on screen.
///
/// The scope pauses Core Motion while the app is inactive or the user has
/// requested reduced motion. Individual cards only repaint their reflection;
/// their layout, blur, and contents remain stable.
class GlassMotionScope extends StatefulWidget {
  const GlassMotionScope({required this.child, super.key});

  final Widget child;

  static final ValueNotifier<Offset> _stillMotion = ValueNotifier(Offset.zero);

  static ValueListenable<Offset> motionOf(BuildContext context) {
    return context
            .dependOnInheritedWidgetOfExactType<_GlassMotionInherited>()
            ?.motion ??
        _stillMotion;
  }

  static bool reduceMotionOf(BuildContext context) {
    return context
            .dependOnInheritedWidgetOfExactType<_GlassMotionInherited>()
            ?.reduceMotion ??
        true;
  }

  @override
  State<GlassMotionScope> createState() => _GlassMotionScopeState();
}

class _GlassMotionScopeState extends State<GlassMotionScope>
    with WidgetsBindingObserver {
  final GlassMotionService _service = GlassMotionService();
  final ValueNotifier<Offset> _motion = ValueNotifier(Offset.zero);

  StreamSubscription<GlassMotionSample>? _subscription;
  AppLifecycleState _lifecycleState = AppLifecycleState.resumed;
  bool _reduceMotion = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final nextReduceMotion =
        MediaQuery.disableAnimationsOf(context) ||
        MediaQuery.accessibleNavigationOf(context);
    if (nextReduceMotion == _reduceMotion && _subscription != null) return;
    _reduceMotion = nextReduceMotion;
    unawaited(_syncSubscription());
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _lifecycleState = state;
    unawaited(_syncSubscription());
  }

  Future<void> _syncSubscription() async {
    final shouldListen =
        mounted &&
        !_reduceMotion &&
        _lifecycleState == AppLifecycleState.resumed;
    if (!shouldListen) {
      await _subscription?.cancel();
      _subscription = null;
      _motion.value = Offset.zero;
      return;
    }
    if (_subscription != null) return;
    _subscription = _service.samples.listen(
      (sample) {
        if (!mounted || _reduceMotion) return;
        _motion.value = sample.offset;
      },
      onError: (_) {
        if (mounted) _motion.value = Offset.zero;
      },
    );
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    unawaited(_subscription?.cancel());
    unawaited(_service.dispose());
    _motion.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return _GlassMotionInherited(
      motion: _motion,
      reduceMotion: _reduceMotion,
      child: widget.child,
    );
  }
}

class _GlassMotionInherited extends InheritedWidget {
  const _GlassMotionInherited({
    required this.motion,
    required this.reduceMotion,
    required super.child,
  });

  final ValueListenable<Offset> motion;
  final bool reduceMotion;

  @override
  bool updateShouldNotify(_GlassMotionInherited oldWidget) {
    return motion != oldWidget.motion || reduceMotion != oldWidget.reduceMotion;
  }
}
