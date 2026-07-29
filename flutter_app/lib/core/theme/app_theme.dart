import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import 'app_colors.dart';

abstract final class AppTheme {
  static ThemeData get dark {
    final colorScheme = const ColorScheme.dark(
      primary: AppColors.diet,
      onPrimary: Colors.white,
      secondary: AppColors.activity,
      onSecondary: Color(0xFF001A05),
      tertiary: AppColors.hydration,
      onTertiary: Color(0xFF001B24),
      error: AppColors.danger,
      onError: Colors.white,
      surface: AppColors.surface,
      onSurface: AppColors.textPrimary,
      outline: AppColors.outline,
    );

    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppColors.background,
      canvasColor: AppColors.background,
      splashFactory: InkSparkle.splashFactory,
    );

    return base.copyWith(
      textTheme: base.textTheme.copyWith(
        displayLarge: const TextStyle(
          fontSize: 64,
          height: 0.96,
          fontWeight: FontWeight.w700,
          letterSpacing: -3.2,
          color: AppColors.textPrimary,
        ),
        displayMedium: const TextStyle(
          fontSize: 48,
          height: 1,
          fontWeight: FontWeight.w700,
          letterSpacing: -2.2,
          color: AppColors.textPrimary,
        ),
        headlineLarge: const TextStyle(
          fontSize: 34,
          height: 1.08,
          fontWeight: FontWeight.w700,
          letterSpacing: -1.3,
          color: AppColors.textPrimary,
        ),
        headlineMedium: const TextStyle(
          fontSize: 26,
          height: 1.12,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.7,
          color: AppColors.textPrimary,
        ),
        titleLarge: const TextStyle(
          fontSize: 20,
          height: 1.2,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.3,
          color: AppColors.textPrimary,
        ),
        titleMedium: const TextStyle(
          fontSize: 16,
          height: 1.25,
          fontWeight: FontWeight.w600,
          color: AppColors.textPrimary,
        ),
        bodyLarge: const TextStyle(
          fontSize: 17,
          height: 1.45,
          fontWeight: FontWeight.w400,
          letterSpacing: -0.15,
          color: AppColors.textPrimary,
        ),
        bodyMedium: const TextStyle(
          fontSize: 15,
          height: 1.4,
          fontWeight: FontWeight.w400,
          color: AppColors.textSecondary,
        ),
        labelLarge: const TextStyle(
          fontSize: 15,
          height: 1.2,
          fontWeight: FontWeight.w700,
          color: AppColors.textPrimary,
        ),
        labelMedium: const TextStyle(
          fontSize: 12,
          height: 1.2,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.2,
          color: AppColors.textSecondary,
        ),
      ),
      cupertinoOverrideTheme: const CupertinoThemeData(
        brightness: Brightness.dark,
        primaryColor: AppColors.diet,
        scaffoldBackgroundColor: AppColors.background,
        barBackgroundColor: Color(0xE6111216),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        surfaceTintColor: Colors.transparent,
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: AppColors.surface,
        modalBackgroundColor: AppColors.surface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
        ),
        showDragHandle: true,
        dragHandleColor: Color(0x33FFFFFF),
      ),
      navigationBarTheme: const NavigationBarThemeData(
        height: 74,
        backgroundColor: Colors.transparent,
        indicatorColor: Color(0x22FFFFFF),
        labelBehavior: NavigationDestinationLabelBehavior.alwaysHide,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0x991D2025),
        hintStyle: const TextStyle(color: AppColors.textTertiary),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 18,
          vertical: 16,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: AppColors.glassBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: AppColors.diet, width: 1.5),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(0, 56),
          backgroundColor: AppColors.diet,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
          ),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.divider,
        thickness: 1,
        space: 1,
      ),
    );
  }
}
